'use strict';
const appRoot = require('app-root-path');
const HttpStatus = require('http-status');
const Error = require('../../error.js');
const ServiceDescriptorService = require(appRoot + '/services/serviceDescriptorService');
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

const countServices = (app) => {
  return (req, res) => {
    let url = require('url');
    let url_parts = url.parse(req.url, true);
    let query = url_parts.query;

    // Filter Params
    let stage = query.stageFilter;
    let region = query.regionFilter;
    let serviceDescriptorService = new ServiceDescriptorService(discoveryModel);
    serviceDescriptorService.countServices(stage, region).then((count) => {
      res.status(HttpStatus.OK).send(count);
    }).catch((err) => {
      new Error(HttpStatus.INTERNAL_SERVER_ERROR, err.message).writeResponse(res);
    });
  }
}

const getService = (app) => {
  return (req, res) => {
    let id = req.params.id;
    let serviceDescriptorService = new ServiceDescriptorService(discoveryModel);
    serviceDescriptorService.findServiceById(id).then((service) => {
      res.status(HttpStatus.OK).send(service);
    }).catch((err) => {
      if(err.name === 'DocumentNotFoundError') {
        let msg = `Service Not Found ${id}`;
        new Error(HttpStatus.NOT_FOUND, msg).writeResponse(res);
      } else {
        new Error(HttpStatus.INTERNAL_SERVER_ERROR, err.message).writeResponse(res);
      }
    });
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
      if(types) {
        typesArray = types.split(',');
      }

      let serviceDescriptorService = new ServiceDescriptorService(discoveryModel);
      serviceDescriptorService.findServices(typesArray, stage, region, pageDescriptor).then((services) => {
        res.status(HttpStatus.OK).send(services);
      }).catch((err) => {
        new Error(HttpStatus.INTERNAL_SERVER_ERROR, err.message).writeResponse(res);
      });
    } catch (err) {
       new Error(HttpStatus.INTERNAL_SERVER_ERROR, err.message).writeResponse(res);
    }
  }
}

/* Public */
exports.getService = getService;
exports.getServices = getServices;
exports.countServices = countServices;
