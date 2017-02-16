'use strict';
const Promise = require('promise');
const request = require('request');
const model = require('discovery-model').model;
const ServiceTypes = require('discovery-model').ServiceTypes;
const WebHook = require('./webHook.js');
const healthCheckRedis = require('health-check-redis');
const debug = require('debug')('discovery-health');

/**
 * Health
 * Responsible for verifying health of a service.
 * Can be configured to report health via 'webhook' to
 * third-party monitoring or notification tools.
 */
class Health {
  constructor(options) {
    if(options)
      this.badHealthWebHook = new WebHook(options.bad_health_web_hook);
  }

  

  /**
   * Check health of service
   */
  healthIsGoodFx(service) {
    let self = this;
    return (callback) => {
      // @TODO: Move this to discovery-model, no hard-coded types please.
      if(service.class == ServiceTypes.WORKER) {
        callback(null);
      } else {
        // checkService and callback(err) if failed
        self.check(service).then((result) => {
          console.log("No error");
          callback(null);
        }).catch((error) => {
          callback(error);
        });
      }
    }
  }

  /**
   * Check swagger of service
   */
  swaggerIsGoodFx(service) {
    return (callback) => {
      // Need to check swagger.json for existence and validation
      callback(null);
    }
  }

  /**
   * Check documentation of service.
   */
  docsAreGoodFx(service) {
    return (callback) => {
      // Need to check docs for existence
      callback(null);
    }
  }

  /**
   * Check Message Broker Health
   * @see health-check-redis
   */
  checkMessageBroker(hosts) {
    return healthCheckRedis.do(hosts).then((result) => { 
      if(result.health === true) {
        model.markWorkersOnline().then(() => {
          return result.health 
        }).catch((err) => {
          console.log(err);
          return result.health;
        });  
      } else {
        model.markWorkersOffline().then(() => {
          return result.health 
        }).catch((err) => {
          console.log(err);
          return result.health;
        });  
      }
    } );
  }

  /**
   * Check the Health of the service.
   * 1. GET healthCheckRoute and if not 200, flag offline.
   * 2. If status is already offline and healthCheckRoute fails, delete service.
   *
   * @TODO Look into refactoring this to make it more readable. - Too many lines
   */
  check(service, update) {
    let p = new Promise((resolve, reject) => {
      // Check the health of the service.
      // Would be nice if we had 'web-hook' integration here such that we can
      // inform interested parties of failed checks.
      request.get(service.endpoint + service.healthCheckRoute, (error, response, body) => {
        if(error) {
          reject(error);
          // Get Service By Id and update Status to 'Offline'
          if(service.status === model.STATUS_OFFLINE) {
            // Delete
            if(update === true) {
              model.deleteService(service).then((deletedServices) => {
                console.log("Service deleted");
              }).error((err) => {
                debug(err);
              });
            }
          } else {
            // Flag offline...
            service.status = model.STATUS_OFFLINE;
            console.log(model);
            console.log(`Updating status ${service.status}`);
            if(update === true) {
              model.updateService(service).then((service) => {
                if(service) {
                  debug(`updated service ${service.id}`);
                  if(this.badHealthWebHook) {
                    this.badHealthWebHook.emit('Service Issue', service);
                  }
                }
              });
            }
          }
        } else if(response.statusCode === 200) {
          console.log(">>>>>>>>>RESPONSE 200");
          resolve(response.body);
          if(update === true) {
            // Get Service By Id and update Status to 'Online'
            model.findServiceById(service.id).then((service) => {
              if(service) {
                service.status = model.STATUS_ONLINE;
                console.log("Flagging online");
                console.log(`Updating status ${service.status}`);
                model.updateService(service).then((service) => {
                  debug(`updated service ${service.id}`);
                });
              }
            });
          }
        } else {
          reject(response.body);
          console.log(response.statusCode);
          console.log(">>>>>>>>>RESPONSE NOT OK");

          // Get Service By Id and update Status to 'Offline'
          if(service.status === model.STATUS_OFFLINE) {
            // Delete
            if(update === true) {
              model.deleteService(service).then((deletedServices) => {
                console.log("Service deleted");
              }).error((err) => {
                debug(err);
              });
            }
          } else {
            service.status = model.STATUS_OFFLINE;
            if(update === true) { // @TODO: What the fuck is this...  Schedule code review please. Was this not done upstairs..?
              model.updateService(service).then((service) => {
                if(service) {
                  debug(`updated service ${service.id}`);
                  if(this.badHealthWebHook) {
                    this.badHealthWebHook.emit('Service Issue', service);
                  }
                }
              });
            }
          }
        }
      });
    });
    return p;
  }
}

// Public
module.exports = Health;
