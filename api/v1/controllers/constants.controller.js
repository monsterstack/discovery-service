'use strict';
const appRoot = require('app-root-path');
const HttpStatus = require('http-status');

const getConstants = (app) => {
  return (req, res) => {
    res.status(HttpStatus.OK).send(require('../../constants'));
  }
}

/* Public */
exports.getConstants = getConstants;
