'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const Plugin = require('.');

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
    const ProxiedPlugin = proxyquire('.', {
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

});
