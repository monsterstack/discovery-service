'use strict';
const appRoot = require('app-root-path');
const HttpStatus = require('http-status');
const Error = require('core-server').Error;
const ConstantsService = require(appRoot + '/services/constantsService');

const getConstants = (app) => {
  return (req, res) => {
    let constantsService = new ConstantsService();
    constantsService.getConstants().then((constants) => {
      res.status(HttpStatus.OK).send(constants);
    }).catch((err) => {
      new Error(HttpStatus.INTERNAL_SERVER_ERROR, err.message).writeResponse(res);
    });
  }
}

/* Public */
exports.getConstants = getConstants;
