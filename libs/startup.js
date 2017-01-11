'use strict';
const debug = require('debug')('discovery-startup');
const glob = require('glob');
const appRoot = require('app-root-path');
const Health = require('./health.js');

/**
 * Schedule Health Check
 */
const scheduleHealthCheck = (model, masterCheck, interval) => {
  setInterval(() => {
    if(masterCheck()) {
      debug('health check');
      model.allServices().then((services) => {
        services.elements.forEach((service) => {
          let health = new Health();
          health.check(service, true).then((response) => {
            debug(response);
          }).catch((err) => {
            console.log(err);
          });
        });
      });
    }
  }, interval);
}

/**
 * Load Http Routes
 */
const loadHttpRoutes = (app, proxy) => {
  glob(appRoot.path + "/api/v1/routes/*.routes.js", {}, (err, files) => {
    files.forEach((file) => {
      require(file)(app, proxy);
    });
  });
}

/**
 * Create Validation Pipeline
 */
const createValidationPipeline = (descriptor) => {
  return [
    new Health().swaggerIsGoodFx(descriptor),
    new Health().healthIsGoodFx(descriptor),
    new Health().docsAreGoodFx(descriptor)
  ]
}

/**
 * Create Error Handler
 */
const createErrorHandler = (serviceId, model, workers) => {
  return function(options, err) {
    if (options.cleanup) {
      console.log('clean');
      model.deleteService({id:serviceId}).then((service) => {
        console.log(`Cleaned up Service ${service.id}`);
        setTimeout(() => {
          process.exit();
        }, 500);
      });
    }

    if (err) {
      console.log(err.stack);
      process.exit();
    }
  }
}

// Public
exports.scheduleHealthCheck = scheduleHealthCheck;
exports.loadHttpRoutes = loadHttpRoutes;
exports.createValidationPipeline = createValidationPipeline;
exports.exitHandlerFactory = createErrorHandler;
