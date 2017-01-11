'use strict';
const Bronto = require('bronto');

/**
 * Leader
 * Utilizes the 'Bully' algorithm to determine the 'master' in a
 * cluster of nodes.
 */
class Leader {
  constructor(redisCli, options) {
    this.redisCli = redisCli;
    this.options = options;

    this.me = new Bronto();
  }

  /**
   * Handle cases where the Leader has 'stepped_down'
   */
  onStepDown(handler) {
    this.me.on('stepped_down', (election) => {
      handler(election);
    });
  }

  /**
   * Handle cases where the Leader has 'stepped_up'
   */
  onStepUp(handler) {
    this.me.on('master', (election) => {
      handler(election);
    });
  }

  /**
   * Join cluster
   */
  join(group) {
    this.me.join(group);
  }
}

// Public
module.exports = Leader;
