'use strict';
const Promise = require('promise');

class ServiceDescriptorService {
  constructor(repo) {
    this.model = repo;
  }

  countServices(typesArray, stage, region, status) {
    let _this = this;
    let p = new Promise((resolve, reject) => {

      _this.model.countServices(typesArray, stage, region, status).then((count) => {
        resolve(count);
      }).error((err) => {
        reject(err);
      });
    });
    return p;
  }

  findUniqueServiceTypes() {
    let _this = this;
    let p = new Promise((resolve, reject) => {
      _this.model.findUniqueServiceTypes().then((unique) => {
        resolve(unique);
      }).error((err) => {
        reject(err);
      });
    });

    return p;
  }

  findServiceById(id) {
    let _this = this;
    let p = new Promise((resolve, reject) => {
      _this.model.findServiceById(id).then((service) => {
        resolve(service);
      }).error((err) => {
        reject(err);
      });
    });
    return p;
  }

  deleteServiceById(id) {
    let _this = this;
    let p = new Promise((resolve, reject) => {
      _this.model.deleteServiceById(id).then((service) => {
        resolve(service);
      }).error((err) => {
        reject(err);
      });
    });

    return p;
  }

  findServices(typesArray, stage, region, status, pageDescriptor) {
    let _this = this;
    let p = new Promise((resolve, reject) => {
      if (typesArray.length > 0) {
        // @TODO: Promise Chain Candidate
        _this.model.findServicesByTypes(typesArray, stage,
            region, status, pageDescriptor).then((services) => {
          _this.model.countServices(typesArray, stage, region, status).then((count) => {
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
        // @TODO: Promise Chain Candidate
        _this.model.allServices(stage, region, status, pageDescriptor).then((services) => {
          _this.model.countServices(null, stage, region, status).then((count) => {
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
