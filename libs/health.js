'use strict';
const Promise = require('promise');
const request = require('request');
const model = require('discovery-model').model;
const WebHook = require('./webHook.js');
const debug = require('debug')('discovery-health');

module.exports = class Health {
  constructor(options) {
    if(options)
      this.badHealthWebHook = new WebHook(options.bad_health_web_hook);
  }

  healthIsGoodFx(service) {
    let self = this;
    return (callback) => {
      // checkService and callback(err) if failed
      // self.checkService(service).then((result) => {
      //   console.log("No error");
      //   callback(null);
      // }).catch((error) => {
      //   callback(error);
      // });
      callback(null);
    }
  }

  swaggerIsGoodFx(service) {
    return (callback) => {
      // Need to check swagger.json for existence and validation
      callback(null);
    }
  }

  docsAreGoodFx(service) {
    return (callback) => {
      // Need to check docs for existence
      console.log("******** Docs are good *******");
      callback(null);
    }
  }

  /**
   * Check the Health of the service.
   * 1. GET healthCheckRoute and if not 200, flag offline.
   * 2. If status is already offline and healthCheckRoute fails, delete service.
   */
  check(service) {
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
            model.deleteService(service).then((deletedServices) => {
              console.log("Service deleted");
            }).error((err) => {
              debug(err);
            });
          } else {
            // Flag offline...
            service.status = model.STATUS_OFFLINE;
            model.updateService(service).then((service) => {
              if(service) {
                console.log(service);
                debug(`updated service ${service.id}`);
                if(this.badHealthWebHook) {
                  this.badHealthWebHook.emit('Service Issue', service);
                }
              }
            });
          }
        } else if(response.statusCode === 200) {
          console.log(">>>>>>>>>RESPONSE 200");
          resolve(response.body);

          // Get Service By Id and update Status to 'Online'
          model.findServiceById(service.id).then((service) => {
            if(service) {
              service.status = model.STATUS_ONLINE;
              model.updateService(service).then((service) => {
                debug(`updated service ${service.id}`);
              });
            }
          });
        } else {
          reject(response.body);
          console.log(response.statusCode);
          console.log(">>>>>>>>>RESPONSE NOT OK");

          // Get Service By Id and update Status to 'Offline'
          if(service.status === model.STATUS_OFFLINE) {
            // Delete
            model.deleteService(service).then((deletedServices) => {
              console.log("Service deleted");
            }).error((err) => {
              debug(err);
            });
          } else {
            service.status = model.STATUS_OFFLINE;
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
      });
    });
    return p;
  }
}
