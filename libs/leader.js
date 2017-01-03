'use strict';
const Bronto = require('bronto');

module.exports = class Leader {
  constructor(redisCli, options) {
    this.redisCli = redisCli;
    this.options = options;

    this.me = new Bronto();
  }

  onStepDown(handler) {
    this.me.on('stepped_down', (election) => {
      handler(election);
    });
  }

  onStepUp(handler) {
    this.me.on('master', (election) => {
      handler(election);
    });
  }

  join(group) {
    this.me.join(group);
  }
}
