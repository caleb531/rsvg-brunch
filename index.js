'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('loggy');
const mkdirpSync = require('mkdirp').sync;
const promiseReflect = require('promise-reflect');

class RsvgPlugin {

  constructor(config) {
    if (config && config.plugins && config.plugins.rsvg) {
      this.config = config.plugins.rsvg;
    } else {
      this.config = {};
    }
    this.publicPath = config.paths.public;
    this.requireRsvg();
  }

  // Require the Rsvg constructor, failing silently if librsvg is not installed
  requireRsvg() {
    try {
      this.Rsvg = require('librsvg').Rsvg;
    } catch (error) {
      logger.warn('please install system-wide librsvg to use rsvg-brunch');
    }
  }

  // Fill in either the width or the height (if either is missing) from the
  // given output file config
  addMissingOutputDimensions(outputFile) {
    // Prepend public directory to output path if output path is relative path
    if (outputFile.path[0] !== '/') {
      outputFile.path = path.join(this.publicPath, outputFile.path);
    }
    if (outputFile.width === undefined) {
      outputFile.width = outputFile.height;
    } else if (outputFile.height === undefined) {
      outputFile.height = outputFile.width;
    }
  }

  // Evaluate path variables (like {width} and {height})
  evaluatePathVariables(outputFile) {
    outputFile.path = outputFile.path
      .replace(/{width}/gi, outputFile.width)
      .replace(/{height}/gi, outputFile.height)
      .replace(/{format}/gi, outputFile.format)
      .replace(/{id}/gi, outputFile.id);
  }

  // Convert the given SVG to the output file witht the specified parameters
  convertSvg(inputPath, outputFile) {
    return new Promise((resolve, reject) => {
      let svg = new this.Rsvg();
      svg.on('finish', () => {
        mkdirpSync(path.dirname(outputFile.path));
        try {
          fs.writeFileSync(outputFile.path, svg.render({
            format: outputFile.format,
            width: outputFile.width,
            height: outputFile.height,
            id: outputFile.id
          }).data);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      fs.createReadStream(inputPath).pipe(svg);
    });
  }

  // Extend the properties and values of the given output file config, filling
  // in missing information and such
  extendOutputProps(conversion, outputFile) {
    outputFile = Object.assign({}, this.globalOutputDefaults, conversion.outputDefaults, outputFile);
    this.addMissingOutputDimensions(outputFile);
    this.evaluatePathVariables(outputFile);
    return outputFile;
  }

  displayOutputError(outputFile, outputError) {
    logger.error(`[rsvg-brunch] failed to generate ${outputFile.path} (${outputError})`);
  }

  displayConversionResults(conversion, numResolved) {
    logger.info(`[rsvg-brunch] generated ${numResolved} of ${conversion.output.length} icon(s) from ${path.basename(conversion.input)}`);
  }

  // Generate icons from the given conversion config; each conversion has one
  // SVG input and one or more outputs
  handleConversion(conversion) {
    // A temporary container to store output promises until they can be passed
    // to Promise.all
    let outputPromises = [];
    // The number of successful outputs for this conversion
    let numResolved = 0;
    conversion.output.forEach((outputFile) => {
      outputFile = this.extendOutputProps(conversion, outputFile);
      let outputPromise = this.convertSvg(conversion.input, outputFile);
      outputPromise
        .then(() => numResolved += 1)
        .catch((error) => this.displayOutputError(outputFile, error));
      outputPromises.push(outputPromise);
    });
    // Promise.all() stops and rejects as soon as any one promise rejects, even
    // if some promises are still in a pending state; using promiseReflect
    // ensures that the conversion results are displayed only when all promises
    // either resolve or reject (i.e. none are pending)
    return Promise.all(outputPromises.map(promiseReflect))
      .then(() => this.displayConversionResults(conversion, numResolved));
  }

  // Generate icons after every Brunch build
  onCompile() {
    if (this.Rsvg) {
      this.config.conversions.forEach((conversion) => {
        this.handleConversion(conversion);
      });
    }
  }

}

// brunchPlugin must be set to true for all Brunch plugins
RsvgPlugin.prototype.brunchPlugin = true;
// Global defaults for all conversion output files
RsvgPlugin.prototype.globalOutputDefaults = {
  format: 'png'
};

module.exports = RsvgPlugin;
