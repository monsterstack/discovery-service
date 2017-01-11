'use strict';
const HttpStatus = require('http-status');
const Error = require('../../error.js');
const discoveryModel = require('discovery-model').model;

/**
 * Build Page Descriptor
 */
const buildPageDescriptor = (query) => {
  return {
    page: query.page || 0,
    size: query.size || 10
  }
}

const getService = (app) => {
  return (req, res) => {
    let id = req.params.id;
    discoveryModel.findServiceById(id).then((service) => {
      req.status(HttpStatus.OK).send(service);
    }).error((err) => {
      new Error(HttpStatus.INTERNAL_SERVER_ERROR, err.message).writeResponse(res);
    })
  }
}

const getServices = (app) => {
  return (req, res) => {
    try {
      let url = require('url');
      let url_parts = url.parse(req.url, true);
      let query = url_parts.query;

      // Filter Params
      let stage = query.stageFilter;
      let region = query.regionFilter;

      // Paging Descriptor
      let pageDescriptor = buildPageDescriptor(query);

      let types = query.types;
      let typesArray = [];

      // Types
      if(types)
        typesArray = types.split(',');

      // Now find services by types
      if(typesArray.length > 0) {
        discoveryModel.findServicesByTypes(typesArray, stage, region, pageDescriptor).then((services) => {
          res.status(HttpStatus.OK).send(services);
        }).error((err) => {
          new Error(HttpStatus.INTERNAL_SERVER_ERROR, err.message).writeResponse(res);
        });
      } else {
        // Nothing to find.
        discoveryModel.allServices(stage, region, pageDescriptor).then((services) => {
          res.status(HttpStatus.OK).send(services);
        }).error((err) => {
          new Error(HttpStatus.INTERNAL_SERVER_ERROR, err.message).writeResponse(res);
        });
      }
    } catch (err) {
      new Error(HttpStatus.INTERNAL_SERVER_ERROR, err.message).writeResponse(res);
    }
  }
}

/* Public */
exports.getService = getService;
exports.getServices = getServices;
