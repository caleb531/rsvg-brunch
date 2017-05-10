'use strict';

const path = require('path');
const fs = require('fs');
const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const tmp = require('tmp');
const Plugin = require('../');

describe('rsvg-brunch', function () {

  // Brunch will automatically supply the default public directory path if it is
  // not explicitly overridden by the user
  const defaultConfig = {paths: {public: 'public'}};

  it('should initialize with empty brunch config', function () {
    const plugin = new Plugin(defaultConfig);
    expect(plugin).to.be.ok;
  });

  it('should initialize with empty plugins config', function () {
    const plugin = new Plugin(
      Object.assign({}, defaultConfig, {plugins: {}}));
    expect(plugin).to.be.ok;
  });

  it('should initialize with empty plugin config', function () {
    const plugin = new Plugin(
        Object.assign({}, defaultConfig, {plugins: {rsvg: {}}}));
    expect(plugin).to.be.ok;
  });

  it('should require Rsvg module if installed', function () {
    const plugin = new Plugin(defaultConfig);
    expect(plugin).to.have.property('Rsvg');
  });

  it('should catch error if system librsvg is not installed', function () {
    const loggerWarnSpy = sinon.spy();
    const ProxiedPlugin = proxyquire('../', {
      librsvg: null,
      loggy: {warn: loggerWarnSpy}
    });
    const plugin = new ProxiedPlugin(defaultConfig);
    expect(plugin).not.to.have.property('Rsvg');
    sinon.assert.calledOnce(loggerWarnSpy);
  });

  it('should apply output defaults', function () {
    const conversion = {
      input: 'input.svg',
      outputDefaults: {format: 'abc', path: 'output.abc'},
      output: [{width: 100}]
    };
    const plugin = new Plugin(defaultConfig);
    expect(plugin.extendOutputProps(conversion, conversion.output[0]))
      .to.have.property('format', 'abc');
  });

  it('should allow output file to override defaults', function () {
    const conversion = {
      input: 'input.svg',
      outputDefaults: {format: 'abc'},
      output: [{width: 100, format: 'def', path: 'output.def'}]
    };
    const plugin = new Plugin(defaultConfig);
    expect(plugin.extendOutputProps(conversion, conversion.output[0]))
      .to.have.property('format', 'def');
  });

  it('should prepend public directory to output file path', function () {
    const conversion = {
      input: 'input.svg',
      output: [{width: 100, path: 'output.png'}]
    };
    const plugin = new Plugin(defaultConfig);
    expect(plugin.extendOutputProps(conversion, conversion.output[0]))
      .to.have.property('path', 'public/output.png');
  });

  it('should supply output file height if missing', function () {
    const conversion = {
      input: 'input.svg',
      output: [{width: 100, path: 'output.png'}]
    };
    const plugin = new Plugin(defaultConfig);
    expect(plugin.extendOutputProps(conversion, conversion.output[0]))
      .to.have.property('height', 100);
  });

  it('should supply output file width if missing', function () {
    const conversion = {
      input: 'input.svg',
      output: [{height: 100, path: 'output.png'}]
    };
    const plugin = new Plugin(defaultConfig);
    expect(plugin.extendOutputProps(conversion, conversion.output[0]))
      .to.have.property('width', 100);
  });

  it('should evaluate {width} path variable', function () {
    const conversion = {
      input: 'input.svg',
      outputDefaults: {path: 'output-{width}.png'},
      output: [{width: 200, height: 100}]
    };
    const plugin = new Plugin(defaultConfig);
    expect(plugin.extendOutputProps(conversion, conversion.output[0]))
      .to.have.property('path', 'public/output-200.png');
  });

  it('should evaluate {height} path variable', function () {
    const conversion = {
      input: 'input.svg',
      outputDefaults: {path: 'output-{height}.png'},
      output: [{width: 200, height: 100}]
    };
    const plugin = new Plugin(defaultConfig);
    expect(plugin.extendOutputProps(conversion, conversion.output[0]))
      .to.have.property('path', 'public/output-100.png');
  });

  it('should evaluate {format} path variable', function () {
    const conversion = {
      input: 'input.svg',
      outputDefaults: {path: 'output.{format}'},
      output: [{width: 200, height: 100, format: 'abc'}]
    };
    const plugin = new Plugin(defaultConfig);
    expect(plugin.extendOutputProps(conversion, conversion.output[0]))
      .to.have.property('path', 'public/output.abc');
  });

  it('should evaluate {id} path variable', function () {
    const conversion = {
      input: 'input.svg',
      outputDefaults: {path: 'output-{id}.png'},
      output: [{width: 200, height: 100, id: 'foo'}]
    };
    const plugin = new Plugin(defaultConfig);
    expect(plugin.extendOutputProps(conversion, conversion.output[0]))
      .to.have.property('path', 'public/output-foo.png');
  });

  it('should resolve conversion with correct parameters', function (done) {
    const outputFile = {
      format: 'png',
      width: 200,
      height: 100,
      path: path.join(
        tmp.dirSync().name,
        tmp.tmpNameSync({template: 'XXXXXX.png'})
      )
    };
    const plugin = new Plugin(defaultConfig);
    const outputPromise = plugin.convertSvg('test/input.svg', outputFile);
    outputPromise.then(() => {
      expect(fs.existsSync(outputFile.path)).to.be.true;
      fs.unlinkSync(outputFile.path);
      done();
    }).catch(() => {
      done(new Error('expected promise to resolve, but rejected instead'));
    });
  });

  it('should reject conversion with invalid parameters', function (done) {
    const outputFile = {
      format: 'png',
      // width cannot be zero; will cause librsvg to throw an error
      width: 0,
      height: 100,
      path: path.join(
        tmp.dirSync().name,
        tmp.tmpNameSync({template: 'XXXXXX.png'})
      )
    };
    const plugin = new Plugin(defaultConfig);
    const outputPromise = plugin.convertSvg('test/input.svg', outputFile);
    outputPromise.then(() => {
      done(new Error('expected promise to reject, but resolved instead'));
    }).catch(() => {
      expect(fs.existsSync(outputFile.path)).to.be.false;
      done();
    });
  });

  it('should be registered as Brunch plugin', function () {
    expect(Plugin.prototype.brunchPlugin).to.be.true;
  });

});
