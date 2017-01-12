'use strict';
const appRoot = require('app-root-path');
const HttpStatus = require('http-status');
const ip = require('ip');

const swagger = require(appRoot + '/api/swagger/swagger.json');
const getSwagger = (app) => {
  return function(req, res) {
    let host = ip.address();
    //@TODO: Base Path should be in config..
    let basePath = '/api/v1';
    swagger.host = host;
    swagger.basePath = basePath;
    res.status(HttpStatus.OK).send(swagger);
  }
}

/* Public */
exports.getSwagger = getSwagger;
