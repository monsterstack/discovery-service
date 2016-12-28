'use strict';
const Promise = require('promise');
const needle = require('needle');
const model = require('discovery-model').model;
const WebHook = require('./webHook.js');
const debug = require('debug')('discovery-health');

module.exports = class Health {
  constructor(options) {
    if(options)
      this.badHealthWebHook = new WebHook(options.bad_health_web_hook);
  }

  check(service) {
    console.log(service);
    let p = new Promise((resolve, reject) => {
      // Check the health of the service.
      // Would be nice if we had 'web-hook' integration here such that we can
      // inform interested parties of failed checks.
      needle.get(service.endpoint + service.health, (error, response) => {
        if(error) {
          reject(error);
        } else if(response.status === 200) {
          resolve(response.body);

          // Get Service By Id and update Status to 'Online'
          model.findServiceById(service.id).then((service) => {
            service.status = model.STATUS_ONLINE;
            model.updateService(service).then((service) => {
              debug(`updated service ${service.id}`);
            });
          });
        } else {
          reject(response.body);

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
              debug(`updated service ${service.id}`);
              if(this.badHealthWebHook) {
                this.badHealthWebHook.emit('Service Issue', service);
              }
            });
          }
        }
      });
    });
    return p;
  }
}
