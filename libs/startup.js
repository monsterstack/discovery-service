'use strict';
const debug = require('debug')('discovery-startup');
const glob = require('glob');
const appRoot = require('app-root-path');
const Health = require('./health.js');
const config = require('config');
const ServiceTypes = require('discovery-model').ServiceTypes;

/**
 * Schedule Health Check
 */
const scheduleHealthCheck = (model, masterCheck, interval) => {
  setInterval(() => {
    if(masterCheck()) {
      debug('health check');
      // Test Message Broker Connectivity

      // Check Services for health.
      model.allServices().then((services) => {
        services.elements.forEach((service) => {
          if(service.class !== ServiceTypes.WORKER) {
            let health = new Health(/**{
              bad_health_web_hook: config.health.webHookUrl
            }**/);
            health.check(service, true).then((response) => {
              debug(response);
            }).catch((err) => {
              console.log(err);
            });
          }
        });
      });

      // Check Message Broker
      let health = new Health();
      // Support for multiple brokers?? @TODO
      health.checkMessageBroker([
        {
          host: config.redis.host,
          port: config.redis.port
        }
      ]).then((isGood) => {
        
      }).catch((err) => {
        console.log(err);
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

  glob(appRoot.path + "/app/routes/*.routes.js", {}, (err, files) => {
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


// Public
exports.scheduleHealthCheck = scheduleHealthCheck;
exports.loadHttpRoutes = loadHttpRoutes;
exports.createValidationPipeline = createValidationPipeline;
