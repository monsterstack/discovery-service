'use strict';
const debug = require('debug')('discovery-startup');
const glob = require('glob');
const appRoot = require('app-root-path');
const Health = require('./health.js');
const config = require('config');
const ServiceTypes = require('discovery-model').ServiceTypes;

const LOAD_AVG_METRIC_NAME = 'load.avg.metric';
const CPU_PERCENT_USAGE_METRIC_NAME = 'cpu.percent.usage.metric';

/**
 * Schedule Health Check
 */
const scheduleHealthCheck = (model, masterCheck, interval, emitter) => {
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
              emitter.emit(LOAD_AVG_METRIC_NAME, {
                serviceId: service.id, 
                serviceType: service.type, 
                loadAvg: response.loadAvg
              });
              emitter.emit(CPU_PERCENT_USAGE_METRIC_NAME, {
                serviceId: service.id, 
                serviceType: service.type, 
                cpuPercentUsage: response.cpuPercentUsage
              });
              debug(response);
            }).catch((err) => {
              debug(err);
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
        debug(err);
      });
    }
  }, interval);
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
exports.createValidationPipeline = createValidationPipeline;
