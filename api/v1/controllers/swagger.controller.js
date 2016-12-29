'use strict';
const appRoot = require('app-root-path');
const HttpStatus = require('http-status');

const swagger = require(appRoot + '/api/swagger/swagger.json');
const getSwagger = (app) => {
  return function(req, res) {
    res.status(HttpStatus.OK).send(swagger);
  }
}

/* Public */
exports.getSwagger = getSwagger;
