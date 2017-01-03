'use strict';
const debug = require('debug')('discovery-startup');
const glob = require('glob');
const appRoot = require('app-root-path');
const Health = require('./health.js');

const scheduleHealthCheck = (model, interval) => {
  setInterval(() => {
    debug('health check');
    model.allServices().then((services) => {
      services.forEach((service) => {
        let health = new Health();
        health.check(service, true).then((response) => {
          debug(response);
        }).catch((err) => {
          console.log(err);
        });
      });
    });
  }, interval);
}

const loadHttpRoutes = (app, proxy) => {
  glob(appRoot.path + "/api/v1/routes/*.routes.js", {}, (err, files) => {
    files.forEach((file) => {
      require(file)(app, proxy);
    });
  });
}

const createValidationPipeline = (descriptor) => {
  return [
    new Health().swaggerIsGoodFx(descriptor),
    new Health().healthIsGoodFx(descriptor),
    new Health().docsAreGoodFx(descriptor)
  ]
}

// Exit handler
const createErrorHandler = (serviceId, model) => {
  return function(options, err) {
    if (options.cleanup) {
      console.log('clean');
      model.deleteService({id:serviceId}).then((service) => {
        console.log(`Cleaned up Service ${service.id}`);
        setTimeout(() => {
          process.exit();
        }, 500);
      })
    }

    if (err) {
      console.log(err.stack);
      process.exit();
    }
  }
}


exports.scheduleHealthCheck = scheduleHealthCheck;
exports.loadHttpRoutes = loadHttpRoutes;
exports.createValidationPipeline = createValidationPipeline;
exports.exitHandlerFactory = createErrorHandler;
