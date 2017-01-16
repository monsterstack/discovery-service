'use strict';
const Promise = require('promise');

class ServiceDescriptorService {
  constructor(repo) {
    this.model = repo;
  }

  countServices(typesArray, stage, region) {
    let self = this;
    let p = new Promise((resolve, reject) => {

      self.model.countServices(typesArray, stage, region).then((count) => {
        resolve(count);
      }).error((err) => {
        reject(err);
      });
    });
    return p;
  }

  findServiceById(id) {
    let self = this;
    let p = new Promise((resolve, reject) => {
      self.model.findServiceById(id).then((service) => {
        resolve(service);
      }).error((err) => {
        reject(err);
      });
    });
    return p;
  }

  findServices(typesArray, stage, region, pageDescriptor) {
    let self = this;
    let p = new Promise((resolve, reject) => {
      if(typesArray.length > 0) {
        self.model.findServicesByTypes(typesArray, stage, region, pageDescriptor).then((services) => {
          self.model.countServices(typesArray, stage, region).then((count) => {
            services.page.total = count.count;
            resolve(services);
          }).error((err) => {
            reject(err);
          });
        }).error((err) => {
          reject(err);
        });
      } else {
        // Nothing to find.
        self.model.allServices(stage, region, pageDescriptor).then((services) => {
          self.model.countServices(null, stage, region).then((count) => {
            services.page.total = count.count;
            resolve(services);
          }).error((err) => {
            reject(err);
          });
        }).error((err) => {
          reject(err);
        });
      }
    });

    return p;
  }
}

// Public
module.exports = ServiceDescriptorService;
