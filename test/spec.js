'use strict';

const path = require('path');
const fs = require('fs');

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire');
const tmp = require('tmp');
const Plugin = require('../');

describe('rsvg-brunch', function () {

  // Brunch will automatically supply the default public directory path if it is
  // not explicitly overridden by the user
  const defaultConfig = {paths: {public: 'public'}};

  function getLoggySpy() {
    return {
      info: sinon.spy(),
      warn: sinon.spy(),
      error: sinon.spy()
    };
  }

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
    const loggySpy = getLoggySpy();
    const ProxiedPlugin = proxyquire('../', {
      librsvg: null,
      loggy: loggySpy
    });
    const plugin = new ProxiedPlugin(defaultConfig);
    expect(plugin).not.to.have.property('Rsvg');
    expect(loggySpy.warn).to.have.been.calledOnce;
  });

  describe('extendOutputProps', function () {

    let conversion;
    beforeEach(function () {
      conversion = {
        input: 'input.svg',
        outputDefaults: {},
        output: [{width: 200, height: 100}]
      };
    });

    it('should apply global output defaults', function () {
      conversion.output[0].path = 'output.png';
      const plugin = new Plugin(defaultConfig);
      expect(plugin.extendOutputProps(conversion, conversion.output[0]))
        .to.have.property('format', 'png');
    });

    it('should apply conversion output defaults', function () {
      conversion.outputDefaults.format = 'abc';
      conversion.outputDefaults.path = 'output.abc';
      const plugin = new Plugin(defaultConfig);
      expect(plugin.extendOutputProps(conversion, conversion.output[0]))
        .to.have.property('format', 'abc');
    });

    it('should allow output file to override defaults', function () {
      conversion.outputDefaults.format = 'abc';
      conversion.output[0].format = 'def';
      conversion.output[0].path = 'output.def';
      const plugin = new Plugin(defaultConfig);
      expect(plugin.extendOutputProps(conversion, conversion.output[0]))
        .to.have.property('format', 'def');
    });

    it('should prepend public directory to output file path', function () {
      conversion.output[0].path = 'output.png';
      const plugin = new Plugin(defaultConfig);
      expect(plugin.extendOutputProps(conversion, conversion.output[0]))
        .to.have.property('path', 'public/output.png');
    });

    it('should supply output file height if missing', function () {
      conversion.output[0].path = 'output.png';
      delete conversion.output[0].height;
      const plugin = new Plugin(defaultConfig);
      expect(plugin.extendOutputProps(conversion, conversion.output[0]))
        .to.have.property('height', 200);
    });

    it('should supply output file width if missing', function () {
      conversion.output[0].path = 'output.png';
      delete conversion.output[0].width;
      const plugin = new Plugin(defaultConfig);
      expect(plugin.extendOutputProps(conversion, conversion.output[0]))
        .to.have.property('width', 100);
    });

    it('should evaluate {width} path variable', function () {
      conversion.outputDefaults.path = 'output-{width}.png';
      const plugin = new Plugin(defaultConfig);
      expect(plugin.extendOutputProps(conversion, conversion.output[0]))
        .to.have.property('path', 'public/output-200.png');
    });

    it('should evaluate {height} path variable', function () {
      conversion.outputDefaults.path = 'output-{height}.png';
      const plugin = new Plugin(defaultConfig);
      expect(plugin.extendOutputProps(conversion, conversion.output[0]))
        .to.have.property('path', 'public/output-100.png');
    });

    it('should evaluate {format} path variable', function () {
      conversion.outputDefaults.path = 'output.{format}';
      conversion.output[0].format = 'abc';
      const plugin = new Plugin(defaultConfig);
      expect(plugin.extendOutputProps(conversion, conversion.output[0]))
        .to.have.property('path', 'public/output.abc');
    });

    it('should evaluate {id} path variable', function () {
      conversion.outputDefaults.path = 'output-{id}.png';
      conversion.output[0].id = 'foo';
      const plugin = new Plugin(defaultConfig);
      expect(plugin.extendOutputProps(conversion, conversion.output[0]))
        .to.have.property('path', 'public/output-foo.png');
    });

  });

  describe('convertSvg', function () {

    let outputFile;
    beforeEach(function () {
      outputFile = {
        format: 'png',
        width: 200,
        height: 200,
        path: path.join(
          tmp.dirSync().name,
          tmp.tmpNameSync({template: 'XXXXXX.png'})
        )
      };
    });

    it('should resolve with correct params', function (done) {
      const plugin = new Plugin(defaultConfig);
      const outputPromise = plugin.convertSvg('test/input.svg', outputFile);
      outputPromise.then(() => {
        expect(fs.existsSync(outputFile.path)).to.be.true;
        fs.unlinkSync(outputFile.path);
        done();
      }).catch(done);
    });

    it('should reject with invalid params', function (done) {
      // width cannot be zero; will cause librsvg to throw an error
      outputFile.width = 0;
      const plugin = new Plugin(defaultConfig);
      const outputPromise = plugin.convertSvg('test/input.svg', outputFile);
      outputPromise.then(() => {
        done(new Error('expected promise to reject, but resolved instead'));
      }, () => {
        expect(fs.existsSync(outputFile.path)).to.be.false;
        done();
      }).catch(done);
    });

  });

  describe('handleConversion', function () {

    let conversion;
    beforeEach(function () {
      conversion = {
        input: 'test/input.svg',
        outputDefaults: {
          path: path.join(
            tmp.dirSync().name,
            tmp.tmpNameSync({template: 'XXXXXX-{width}.png'})
          )
        },
        output: [
          {width: 32},
          {width: 64},
          {width: 128}
        ]
      };
    });

    it('should display info message after all outputs finish', function (done) {
      const loggySpy = getLoggySpy();
      const ProxiedPlugin = proxyquire('../', {loggy: loggySpy});
      const plugin = new ProxiedPlugin(defaultConfig);
      const conversionPromise = plugin.handleConversion(conversion);
      conversionPromise.then(() => {
        expect(loggySpy.info).to.have.been.calledOnce;
        expect(loggySpy.info).to.have.been.calledWith(sinon.match(/3 of 3/gi));
        done();
      }).catch(done);
    });

    it('should display error for each unsuccessful output', function (done) {
      const loggySpy = getLoggySpy();
      const ProxiedPlugin = proxyquire('../', {loggy: loggySpy});
      const plugin = new ProxiedPlugin(defaultConfig);
      // Ensure that default extendOutputProps does not prepend /public
      // plugin.extendOutputProps;
      conversion.output[1].height = 0;
      const conversionPromise = plugin.handleConversion(conversion);
      conversionPromise.then(() => {
        expect(loggySpy.error).to.have.been.calledOnce;
        expect(loggySpy.error).to.have.been.calledWith(sinon.match(/64/gi));
        done();
      }).catch(done);
    });

    it('should display correct total in info message', function (done) {
      const loggySpy = getLoggySpy();
      const ProxiedPlugin = proxyquire('../', {loggy: loggySpy});
      const plugin = new ProxiedPlugin(defaultConfig);
      // Ensure that default extendOutputProps does not prepend /public
      // plugin.extendOutputProps;
      conversion.output[1].height = 0;
      const conversionPromise = plugin.handleConversion(conversion);
      conversionPromise.then(() => {
        expect(loggySpy.info).to.have.been.calledOnce;
        expect(loggySpy.info).to.have.been.calledWith(sinon.match(/2 of 3/gi));
        done();
      }).catch(done);
    });

  });

  describe('onCompile', function () {

    let config;
    beforeEach(function () {
      config = {
        plugins: {
          rsvg: {
            conversions: [
              sinon.spy(),
              sinon.spy(),
              sinon.spy()
            ]
          }
        }
      };
    });

    it('should run conversions when librsvg is available', function () {
      const plugin = new Plugin(Object.assign(defaultConfig, config));
      plugin.handleConversion = sinon.spy();
      plugin.onCompile();
      const conversions = config.plugins.rsvg.conversions;
      expect(plugin.handleConversion).to.have.been.calledWith(conversions[0]);
      expect(plugin.handleConversion).to.have.been.calledWith(conversions[1]);
      expect(plugin.handleConversion).to.have.been.calledWith(conversions[2]);
    });

    it('should not run conversions when librsvg is not available', function () {
      const plugin = new Plugin(Object.assign(defaultConfig, config));
      plugin.handleConversion = sinon.spy();
      delete plugin.Rsvg;
      plugin.onCompile();
      expect(plugin.handleConversion).not.to.have.been.called;
    });

  });

  it('should be registered as Brunch plugin', function () {
    expect(Plugin.prototype.brunchPlugin).to.be.true;
  });

});
