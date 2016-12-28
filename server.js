'use strict';

const glob = require('glob');

/**
 * Discovery Service is Responsible for pushing changes to
 * ServiceDescriptor(s) (i.e. route tables) to interested parties.
 *
 * Discovery Service also provides a Rest API to request said ServiceDescriptor(s) on demand.
 */
const main = () => {
  const config = require('config');
  const async = require('async');
  const sha1 = require('sha1');
  const debug = require('debug')('discovery-service');
  const model = require('discovery-model').model;
  const Health = require('./libs/health.js');
  const HEALTH_CHECK_INTERVAL = config.healthCheck.interval;
  const RESPONSE_TIME_METRIC_KEY = "response_time";

  console.log(`Starting Discovery Service on ${config.port}`);
  let app = require('express')();
  let http = require('http').Server(app);
  let io = require('socket.io')(http);

  /*
   * Clients interested in discovery
   * Here we want to map the query to an array of clients performing
   * said query.  When the query 'fires' a change event we will emit the
   * data to all subscribers that are interested.
   * {
   *   SHA("{\"type\": \"FooService\"}"): [<client>, ...]
   * }
   */
  let subscribers = {};
  let feeds = {};

  setInterval(() => {
    console.log('health check');
    model.allServices().then((services) => {
      services.forEach((service) => {
        let health = new Health();
        health.check(service).then((response) => {
          console.log(response);
        }).catch((err) => {
          console.log(err);
        });
      });
    });
  }, HEALTH_CHECK_INTERVAL);

  /* Http Routes */
  glob("./api/v1/routes/*.routes.js", {}, (err, files) => {
    files.forEach((file) => {
      require(file)(app);
    });
  });

  http.listen(config.port, () => {
    console.log(`listening on *:${config.port}`);
  });

  io.on('connection', (socket) => {
    console.log("Got connection..");

    /**
     * Listen for metric data from proxy.
     */
    socket.on('services:metrics', (msg) => {
      debug(msg);
      // Store Metrics (i.e. response_time) and associate with service
      let metric = msg;
      let serviceId = msg.serviceId;
      let value = msg.value;
      if(metric.type === RESPONSE_TIME_METRIC_KEY) {
        // append response_time to service.rtimes
        model.findServiceById(serviceId).then((service) => {
          if(service.rtimes) {
            if(service.rtimes.length > 0 && service.rtimes.length < 10){
              service.rtimes.splice(0, 1);
              service.rtimes.push(value);
            } else {
              service.rtimes.push(value);
            }
          }
        }).error((err) => {
          console.log("Failed to find related service...");
          console.log(err);
        });
      }
    }); // -- close on-services:metrics

    socket.on('services:offline', (msg) => {
      debug(msg);
      let serviceId = msg.serviceId;
      model.findServiceById(serviceId).then((service) => {
        if(service) {
          service.status = model.STATUS_OFFLINE;
          model.updateService(service).then((service) => {
            debug(`updated status of service ${service.id} to offline`);
          }).error((error) => {
            debug(error);
          });
        }
      }).error((error) => {
        debug(error);
      })
    }); // -- close on-services:offline

    socket.on('services:online', (msg) => {
      debug(msg);
      let serviceId = msg.serviceId;
      model.findServiceById(serviceId).then((service) => {
        if(service) {
          service.status = model.STATUS_ONLINE;
          model.updateService(service).then((service) => {
            debug(`updated status of service ${service.id} to online`);
          }).error((error) => {
            debug(error);
          });
        }
      }).error((error) => {
        debug(error);
      })
    }); // -- close on-services:online

    socket.on('services:subscribe', (msg) => {
      debug(msg);
      let query = msg;
      let key = sha1(JSON.stringify(query));

      /**
        * Handle disconnect event.  In this situation we need to clean up
        * the client connections / subscriptions and close all feeds that
        * are no longer needed.
        */
      socket.on('disconnect', (event) => {
        debug('Disconnect Event');
        debug(event);
        subscribers[key].splice(socket);

        /** Clean it up 'bish' **/
        if(subscribers[key].length === 0) {
          //feeds[key].closeFeed();
          delete feeds[key];
          delete subscribers[key];
        }
      }); // close on-disconnect

      /**
        * Bundle all connected clients based on interested query 'sha'
        * Also, keep track of the feed by query 'sha' such that the feed can
        * be closed when it's usefullness ceases to exist
        **/
      if(subscribers[key]) {
        subscribers[key].push(socket);
      } else {
        subscribers[key] = [socket];
        feeds[key] = [];
        /* Start Query --
          * Need some handle on this so we can kill the query when all interested parties disconnect
          */
        model.onServiceChange([query.types], (err, change) => {
          let keys = Object.keys(subscribers);
          keys.forEach((key) => {
            let clients = subscribers[key];
            // Falsey check
            if(!feeds[key]) {
              feeds[key] = change.record;
            }
            clients.forEach((client) => {
              client.emit('service.added', change.change);
              client.emit('service.removed', change.change);
              client.emit('service.updated', change.change);
            });
          });
        });
      }
    }); // -- close on-services:subscribe

    socket.on('services:init', (msg) => {
      debug(msg);
      let query = msg;
      let descriptor = msg.descriptor;
      // Validate Descriptor and verify that the service is 'kosher'
      // Waterfall??
      // i.e. swagger.json is good
      // docs route exists and returns 200
      // health route exists and returns 200
      if(descriptor) {
        async.waterfall([
          new Health().swaggerIsGoodFx(descriptor),
          new Health().healthIsGoodFx(descriptor),
          new Health().docsAreGoodFx(descriptor)
        ], (err, results) => {
          if(err) {
            debug(err);
          } else if(results) {
            console.log(results);
            if(descriptor) {
              // Save Descriptor
              model.saveService(descriptor).then((service) => {
                debug(`Saved Service Descriptor in registry for ${service.id}`);
              }).error((err) => {
                debug('Error registering service');
                console.log(error);
              });
            }

            // Find services by types..
            model.findServicesByTypes(query.types).then((services) => {
              console.log(services);
              services.forEach((service) => {
                debug(service);
                console.log(service);
                socket.emit('service.init', service);
              });
            });
          }
        });
      }
    }); // -- close on-services.init
  }); // -- close on-connection
}

/* Method main - Ha */
if(require.main === module) {
  main();
}

module.exports.client = require('./libs/client');
