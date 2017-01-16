'use strict';
const Promise = require('promise');

class ServiceDescriptorService {
  constructor(repo) {
    this.model = repo;
  }

  countServices(typesArray, stage, region, status) {
    let self = this;
    let p = new Promise((resolve, reject) => {

      self.model.countServices(typesArray, stage, region, status).then((count) => {
        resolve(count);
      }).error((err) => {
        reject(err);
      });
    });
    return p;
  }

  findUniqueServiceTypes() {
    let self = this;
    let p = new Promise((resolve, reject) => {
      self.model.findUniqueServiceTypes().then((unique) => {
        resolve(unique);
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

  findServices(typesArray, stage, region, status, pageDescriptor) {
    let self = this;
    let p = new Promise((resolve, reject) => {
      if(typesArray.length > 0) {
        self.model.findServicesByTypes(typesArray, stage, region, status, pageDescriptor).then((services) => {
          self.model.countServices(typesArray, stage, region, status).then((count) => {
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
        self.model.allServices(stage, region, status, pageDescriptor).then((services) => {
          self.model.countServices(null, stage, region, status).then((count) => {
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
