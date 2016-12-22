'use strict';
const HttpStatus = require('http-status');
const Error = require('../../error.js');
const discoveryModel = require('discovery-model').model;

const getServices = (app) => {
  return function(req, res) {
    try {
      let url = require('url');
      let url_parts = url.parse(req.url, true);
      let query = url_parts.query;

      let types = query.types;
      let typesArray = [];

      if(types)
        typesArray = types.split(',');

      // Now find services by types
      if(typesArray.length > 0) {
        discoveryModel.findServicesByTypes(typesArray).then((services) => {
          res.status(HttpStatus.OK).send(services);
        }).error((err) => {
          new Error(HttpStatus.INTERNAL_SERVER_ERROR, err.message).writeResponse(res);
        });
      } else {
        // Nothing to find.
        res.status(HttpStatus.OK).send([]);
      }
    } catch (err) {
      new Error(HttpStatus.INTERNAL_SERVER_ERROR, err.message).writeResponse(res);
    }
  }
}

/* Public */
exports.getServices = getServices;
