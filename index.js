'use strict';

class RsvgPlugin {

  constructor(config) {
    if (config && config.plugins && config.plugins.rsvg) {
      this.config = config.plugins.pegjs;
    } else {
      this.config = {};
    }
    this.publicPath = config.paths.public;
  }

}

// brunchPlugin must be set to true for all Brunch plugins
RsvgPlugin.prototype.brunchPlugin = true;

module.exports = RsvgPlugin;
