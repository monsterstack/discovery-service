'use strict';
const appRoot = require('app-root-path');
const HttpStatus = require('http-status');
const ServiceError = require('core-server').ServiceError;
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

const deleteService = (app) => {
  return (req, res) => {
    let id = req.params.id;

    serviceDescriptorService.deleteService({id: id}).then((deleted) => {
      res.status(HttpStatus.OK).send(deleted);
    }).catch((err) => {
      new ServiceError(HttpStatus.INTERNAL_SERVER_ERROR, err.message).writeResponse(res);
    })
  }
}

const countServices = (app) => {
  return (req, res) => {
    let url = require('url');
    let url_parts = url.parse(req.url, true);
    let query = url_parts.query;

    let types = query.types;
    let typesArray = null;
    if(types) {
      typesArray = types.split(',');
    }

    // Filter Params
    let stage = query.stageFilter;
    let region = query.regionFilter;
    let status = query.statusFilter;
    let serviceDescriptorService = new ServiceDescriptorService(discoveryModel);
    serviceDescriptorService.countServices(typesArray, stage, region, status).then((count) => {
      res.status(HttpStatus.OK).send(count);
    }).catch((err) => {
      new ServiceError(HttpStatus.INTERNAL_SERVER_ERROR, err.message).writeResponse(res);
    });
  }
}

const uniqueServiceTypes = (app) => {
  return (req, res) => {
    let serviceDescriptorService = new ServiceDescriptorService(discoveryModel);
    serviceDescriptorService.findUniqueServiceTypes().then((unique) => {
      res.status(HttpStatus.OK).send(unique);
    }).catch((err) => {
      new ServiceError(HttpStatus.INTERNAL_SERVER_ERROR, err.message).writeResponse(res);
    })
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
        new ServiceError(HttpStatus.NOT_FOUND, msg).writeResponse(res);
      } else {
        new ServiceError(HttpStatus.INTERNAL_SERVER_ERROR, err.message).writeResponse(res);
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
      let status = query.statusFilter;
      // Paging Descriptor
      let pageDescriptor = buildPageDescriptor(query);
      let types = query.types;
      let typesArray = [];
      if(types) {
        typesArray = types.split(',');
      }

      let serviceDescriptorService = new ServiceDescriptorService(discoveryModel);
      serviceDescriptorService.findServices(typesArray, stage, region, status, pageDescriptor).then((services) => {
        res.status(HttpStatus.OK).send(services);
      }).catch((err) => {
        new ServiceError(HttpStatus.INTERNAL_SERVER_ERROR, err.message).writeResponse(res);
      });
    } catch (err) {
       new ServiceError(HttpStatus.INTERNAL_SERVER_ERROR, err.message).writeResponse(res);
    }
  }
}

/* Public */
exports.getService = getService;
exports.getServices = getServices;
exports.countServices = countServices;
exports.deleteService = deleteService;
exports.uniqueServiceTypes = uniqueServiceTypes;
