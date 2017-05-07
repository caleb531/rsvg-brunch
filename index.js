'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('loggy');
const mkdirpSync = require('mkdir-recursive').mkdirSync;

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
    outputFile.path = path.join(this.publicPath, outputFile.path);
    if (outputFile.width === undefined) {
      outputFile.width = outputFile.height;
    } else if (outputFile.height === undefined) {
      outputFile.height = outputFile.width;
    }
  }

  // Evaluate path variables (like {width} and {height})
  evaluatePathVariables(outputFile) {
    outputFile.path = outputFile.path
      .replace(/{w(idth)?}/gi, outputFile.width)
      .replace(/{h(eight)?}/gi, outputFile.height)
      .replace(/{f(ormat)?}/gi, outputFile.format)
      .replace(/{i(d)?}/gi, outputFile.id);
  }

  // Convert the given SVG to the output file witht the specified parameters
  convertSvg(inputPath, outputFile) {
    let svg = new this.Rsvg();
    svg.on('finish', () => {
      mkdirpSync(path.dirname(outputFile.path));
      fs.writeFileSync(outputFile.path, svg.render({
        format: outputFile.format,
        width: outputFile.width,
        height: outputFile.height,
        id: outputFile.id
      }).data);
    });
    fs.createReadStream(inputPath).pipe(svg);
  }

  // Generate the given output file for the given input path
  handleOutput(conversion, outputFile) {
    outputFile = Object.assign({}, this.globalOutputDefaults, conversion.outputDefaults, outputFile);
    this.addMissingOutputDimensions(outputFile);
    this.evaluatePathVariables(outputFile);
    this.convertSvg(conversion.input, outputFile);
  }

  // Generate icons from the given conversion config; each conversion has one
  // SVG input and one or more outputs
  handleConversion(conversion) {
    conversion.output.forEach((outputFile) => {
      this.handleOutput(conversion, outputFile);
    });
    logger.info(`generated ${conversion.output.length} icon(s) from ${path.basename(conversion.input)}`);
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
