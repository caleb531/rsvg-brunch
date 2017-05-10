'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const logger = require('loggy');
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
    const origLoggerWarn = logger.warn;
    logger.warn = sinon.spy();
    try {
      // Cause require('librsvg').Rsvg to throw an error
      let ProxiedPlugin = proxyquire('.', {librsvg: null});
      const plugin = new ProxiedPlugin(defaultConfig);
      expect(plugin).not.to.have.property('Rsvg');
      sinon.assert.calledOnce(logger.warn);
    } finally {
      logger.warn = origLoggerWarn;
    }
  });

});
