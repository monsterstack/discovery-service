'use strict';

const glob = require('glob');
const Promise = require('promise');
const uuid = require('node-uuid');

const optimist = require('optimist');
const authSetup = require('socketio-auth');

const RESPONSE_TIME_METRIC_KEY = "response_time";

/**
 * Discovery Service is Responsible for pushing changes to
 * ServiceDescriptor(s) (i.e. route tables) to interested parties.
 *
 * Discovery Service also provides a Rest API to request said ServiceDescriptor(s) on demand.
 */
const main = () => {
  let config = require('config');
  let proxy = require('discovery-proxy');
  let async = require('async');
  let sha1 = require('sha1');
  let debug = require('debug')('discovery-service');
  let model = require('discovery-model').model;
  let Health = require('./libs/health.js');
  let healthCheckInterval = config.healthCheck.interval;


  let startup = require('./libs/startup.js');

  let id = uuid.v1();

  let announcement = require('./announcement.json');
  announcement.id = id;

  let announce = false;

  if(optimist.argv.randomWorkerPort === 'true') {
    config.port = 0;
  }

  if(optimist.argv.announce === 'true') {
    announce = true;
  }

  if(optimist.argv.region) {
    announcement.region = optimist.argv.region;
  }

  if(optimist.argv.stage) {
    announcement.stage = optimist.argv.stage;
  }

  /**
   * Need to bind to `exit` so we can remove DiscoveryService from registry
   */
  let bindCleanUp = () => {
    process.stdin.resume();//so the program will not close instantly

    // Exit handler
    let exitHandler = startup.exitHandlerFactory(id, model);

    //do something when app is closing
    process.on('exit', exitHandler.bind(null,{cleanup:true}));

    //catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(null, {cleanup:true}));

    //catches uncaught exceptions
    process.on('uncaughtException', exitHandler.bind(null, {cleanup:true}));
  };

  /**
   * Construct my announcement
   */
  let getMe = () => {
    let announce = require('./announcement.json');
    let descriptor = {
      type: 'DiscoveryService',
      healthCheckRoute: '/health',
      schemaRoute: '/swagger.json',
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

  console.log(`Starting Discovery Service on ${config.port}`);
  let app = require('express')();
  let http = require('http').Server(app);
  let io = require('socket.io')(http);
  let ioredis = require('socket.io-redis');

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
  let subscribers = {};
  let feeds = {};

  setInterval(() => {
    console.log(Object.keys(feeds));
  }, 30000);

  /* Handle exit -- Only if announcing descriptor to self */
  if(announce === true)
    bindCleanUp();

  if(announce === true) {
    // Dispatch Proxy -- init / announce
    getMe().then((me) => {
      console.log(me);
      proxy.connect({addr:'http://0.0.0.0:7616'}, (err, p) => {
        p.bind({ descriptor: me, types: [] });
      });
    }).catch((err) => {
      console.log(err);
    });

    /** Health Check Schedule **/
    startup.scheduleHealthCheck(model, () => {
      return true;
    }, healthCheckInterval);


  }

  /* Http Routes */
  startup.loadHttpRoutes(app, proxy);

  http.listen(config.port, () => {
    console.log(`listening on *:${config.port}`);
  });

  // https://www.npmjs.com/package/socketio-auth
  io.on('connection', (socket) => {

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
        debug(key);
        if(subscribers[key]) {
          console.log(socket.id);
          console.log(subscribers[key]);
          let spliced = subscribers[key].splice(subscribers[key].indexOf(socket.id), 1);
          console.log(spliced);
          /** Clean it up 'bish' **/
          if(subscribers[key].length === 0) {
            // console.log(feeds[key]);
            // feeds[key].closeFeed();
            delete feeds[key];
            delete subscribers[key];
          }
        } else {
          debug("WARN - MISSING KEY ....... DELETE FAILED");
        }
      }); // close on-disconnect

      if(query.types && query.types.length > 0) {
        /**
          * Bundle all connected clients based on interested query 'sha'
          * Also, keep track of the feed by query 'sha' such that the feed can
          * be closed when it's usefullness ceases to exist
          **/
        if(subscribers[key]) {
          subscribers[key].push(socket.id);
        } else {
          subscribers[key] = [socket.id];
          feeds[key] = [];
          /* Start Query --
            * Need some handle on this so we can kill the query when all interested parties disconnect
            */
          let myFeed = model.onServiceChange(query.types, (err, change) => {
            let keys = Object.keys(subscribers);
            keys.forEach((key) => {
              console.log(key);
              let clients = subscribers[key];
              console.log(`Client count ${clients.length}`);
              clients.forEach((client) => {
                if(change.isNew === true) {
                  io.to(client).emit('service.added', change.change);
                } else if(change.deleted === true) {
                  io.to(client).emit('service.removed', change.change);
                } else {
                  io.to(client).emit('service.updated', change.change);
                }
              });
            });
          });

          feeds[key] = myFeed;
        }
      }
    }); // -- close on-services:subscribe

    socket.on('services:init', (msg) => {
      debug(msg);
      let query = msg;
      let descriptor = msg.descriptor;
      // Validate Descriptor and verify that the service is 'kosher'
      if(descriptor) {
        async.waterfall(
          startup.createValidationPipeline(descriptor),
          (err, results) => {
          if(err) {
            debug(err);
          } else {
            // Save Descriptor
            model.saveService(descriptor).then((service) => {
              debug(`Updated Service Descriptor in registry for ${service.id}`);
            }).error((err) => {
              debug('Error registering service');
              debug(err);
            });
            // Find services by types..
            model.findServicesByTypes(query.types).then((services) => {
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
        model.findServicesByTypes(query.types).then((services) => {
          debug(services);
          services.elements.forEach((service) => {
            debug(service);
            socket.emit('service.init', service);
          });
        });
      }
    }); // -- close on-services.init
  }); // -- close on-connection


  process.on('message', function(msg, socket) {
        if (msg !== 'sticky-session:connection') return;
        // Emulate a connection event on the server by emitting the
        // event with the connection the master sent us.
        http.emit('connection', socket);
    });
}

/* Method main - Ha */
if(require.main === module) {
  main();
}

module.exports.client = require('./libs/client');
