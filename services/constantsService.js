'use strict';
const Promise = require('promise');
const appRoot = require('app-root-path');

class ConstantsService {
  constructor() {

  }

  getConstants() {
    let p = new Promise((resolve, reject) => {
      resolve(require(appRoot + '/api/constants'));
    });

    return p;
  }
}

module.exports = ConstantsService;
