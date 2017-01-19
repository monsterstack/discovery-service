'use strict';

const debug = require('debug')('discovery-service-lifecycle');
const config = require('config');
const async = require('async');
const sha1 = require('sha1');
const startup = require('./startup');
const Promise = require('promise');
const RESPONSE_TIME_METRIC_KEY = "response_time";
const REFRESH_EVENT = "refresh_event";

class ServiceLifecycle {
  constructor(io, ioredis, repo) {
    this.model = repo;
    this.io = io;
    this.ioredis = ioredis;
    // io.adapter(ioredis({
    //   host: 'localhost',
    //   port: 6379
    // }));

    // authSetup(io, {
    //   authenticate: (socket, data, callback) => {
    //       callback(null, true);
    //   }
    // });

    /*
     * Clients interested in discovery
     * Here we want to map the query to an array of clients performing
     * said query.  When the query 'fires' a change event we will emit the
     * data to all subscribers that are interested.
     * {
     *   SHA("{\"type\": \"FooService\"}"): [<client>, ...]
     * }
     */
    this.subscribers = {};
    this.feeds = {};

    setInterval(() => {
      console.log(Object.keys(this.feeds));
    }, 30000);
  }

  getMe(id, announce) {
    let descriptor = {
      type: 'DiscoveryService',
      healthCheckRoute: '/health',
      schemaRoute: '/swagger.json',
      docsPath: announce.docsPath,
      timestamp: new Date(),
      id: id,
      region: announce.region,
      stage: announce.stage,
      status: 'Online',
      version: announce.version
    };

    let p = new Promise((resolve, reject) => {
      let ip = require('ip');
      console.log(ip.address());
      descriptor.endpoint = "http://"+ip.address()+":"+config.port
      resolve(descriptor);
    });
    return p;
  }

  authenticate() {

  }

  handleSubscribe(subscribeMessage, socket) {
    debug(subscribeMessage);
    let query = subscribeMessage;
    let key = sha1(JSON.stringify(query));

    /**
      * Handle disconnect event.  In this situation we need to clean up
      * the client connections / subscriptions and close all feeds that
      * are no longer needed.
      */
    socket.on('disconnect', (event) => {
      debug('Disconnect Event');
      debug(event);
      debug(key);
      if(this.subscribers[key]) {
        console.log(`Socket id ${socket.id}`);
        console.log(`Before ${this.subscribers[key]}`);
        let spliced = this.subscribers[key].splice(this.subscribers[key].indexOf(socket.id), 1);
        console.log(`After ${this.subscribers[key]}`);
        /** Clean it up 'bish' **/
        if(this.subscribers[key].length === 0) {
          // console.log(feeds[key]);
          // feeds[key].closeFeed();

          delete this.feeds[key];
          delete this.subscribers[key];
        }
      } else {
        debug("WARN - MISSING KEY ....... DELETE FAILED");
      }

      if(socket.service_id) {
        console.log(`Deleting Service ${socket.service_id}`);
        this.model.deleteService(socket.service_id).then((result) => {
          console.log(`Deleted Service ${socket.service_id}`);
          socket.broadcast.emit(REFRESH_EVENT, { serviceId: socket.service_id });
        }).error((err) => {
          console.log(err);
        });
      } else {
        console.log(`Socket missing services id`);
      }

    }); // close on-disconnect

    if(query.types && query.types.length > 0) {
      /**
        * Bundle all connected clients based on interested query 'sha'
        * Also, keep track of the feed by query 'sha' such that the feed can
        * be closed when it's usefullness ceases to exist
        **/
      if(this.subscribers[key]) {
        this.subscribers[key].push(socket.id);
      } else {
        this.subscribers[key] = [socket.id];
        this.feeds[key] = [];
        /* Start Query --
          * Need some handle on this so we can kill the query when all interested parties disconnect
          */
        let myFeed = this.model.onServiceChange(query.types, (err, change) => {
          let keys = Object.keys(this.subscribers);
          keys.forEach((key) => {
            console.log(key);
            let clients = this.subscribers[key];
            console.log(`Client count ${clients.length}`);
            clients.forEach((client) => {
              console.log(`Sending to client ${client}`);
              console.log(clients);
              if(change.isNew === true) {
                console.log('Sending add');
                this.io.to(client).emit('service.added', change.change);
              } else if(change.deleted === true) {
                console.log('Sending remove');
                this.io.to(client).emit('service.removed', change.change);
              } else {
                console.log('Sending update');
                this.io.to(client).emit('service.updated', change.change);
              }
            });
          });
        });

        this.feeds[key] = myFeed;
      }
    }
  }

  handleInit(initMessage, socket) {
    debug(initMessage);
    let query = initMessage;
    let descriptor = initMessage.descriptor;
    // Validate Descriptor and verify that the service is 'kosher'
    if(descriptor) {
      async.waterfall(
        startup.createValidationPipeline(descriptor),
        (err, results) => {
        if(err) {
          debug(err);
        } else {
          // Save Descriptor
          this.model.saveService(descriptor).then((service) => {
            socket.service_id = service.id;
            debug(`Updated Service Descriptor in registry for ${service.id}`);
            socket.broadcast.emit(REFRESH_EVENT, { serviceId: service.id });
          }).error((err) => {
            debug('Error registering service');
            debug(err);
          });
          // Find services by types..
          this.model.findServicesByTypes(query.types).then((services) => {
            services.elements.forEach((service) => {
              debug(service);
              socket.emit('service.init', service);
            });
          });
        }
      });
    } else {
      // No Descriptor so just init the query types.
      // Find services by types..
      this.model.findServicesByTypes(query.types).then((services) => {
        debug(services);
        services.elements.forEach((service) => {
          debug(service);
          socket.emit('service.init', service);
        });
      });
    }
  }

  handleOnline(onlineMessage, socket) {
    debug(onlineMessage);
    let serviceId = onlineMessage.serviceId;
    model.findServiceById(serviceId).then((service) => {
      if(service) {
        service.status = this.model.STATUS_ONLINE;
        model.updateService(service).then((service) => {
          debug(`updated status of service ${service.id} to online`);
          socket.broadcast.emit(REFRESH_EVENT, { serviceId: socket.service_id });
        }).error((error) => {
          debug(error);
        });
      }
    }).error((error) => {
      debug(error);
    });
  }

  handleOffline(offlineMessage, socket) {
    debug(offlineMessage);
    let serviceId = offlineMessage.serviceId;
    this.model.findServiceById(serviceId).then((service) => {
      if(service) {
        service.status = this.model.STATUS_OFFLINE;
        model.updateService(service).then((service) => {
          debug(`updated status of service ${service.id} to offline`);
          socket.broadcast.emit(REFRESH_EVENT, { serviceId: socket.service_id });
        }).error((error) => {
          debug(error);
        });
      }
    }).error((error) => {
      debug(error);
    });
  }

  handleMetrics(metric, socket) {
    let serviceId = metric.serviceId;
    let value = metric.value;
    if(metric.type === RESPONSE_TIME_METRIC_KEY) {
      // append response_time to service.rtimes
      this.model.findServiceById(serviceId).then((service) => {
        if(service.rtimes) {
          if(service.rtimes.length > 0 && service.rtimes.length < 10){
            service.rtimes.splice(0, 1);
            service.rtimes.push(value);
          } else {
            service.rtimes.push(value);
          }

          // Compute avg
          let total = 0;
          let avg = 0;
          for(let i in service.rtimes) {
            total += service.rtimes[i];
            avg = total/(service.rtimes.length);
          }

          service.avgTime = avg;

          model.updateService(service).then((updated) => {
            debug(`Updated service ${service.id}`);
          });
        }
      }).error((err) => {
        console.log("Failed to find related service...");
        console.log(err);
      });
    }
  }


}

// Public
module.exports = ServiceLifecycle;
