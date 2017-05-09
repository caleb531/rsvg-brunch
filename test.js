'use strict';

const expect = require('chai').expect;
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

});
