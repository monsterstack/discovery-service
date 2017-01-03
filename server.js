'use strict';

const glob = require('glob');
const Promise = require('promise');
const uuid = require('node-uuid');

const optimist = require('optimist');


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
  let HEALTH_CHECK_INTERVAL = config.healthCheck.interval;
  let RESPONSE_TIME_METRIC_KEY = "response_time";

  let startup = require('./libs/startup.js');

  let NAME = 'DiscoveryService';
  let REGION = 'us-east-1';
  let STAGE = 'dev';
  let VERSION = 'v1';
  let ID = uuid.v1();

  let announce = false;

  if(optimist.argv.randomWorkerPort === 'true') {
    config.port = 0;
  }

  if(optimist.argv.announce === 'true') {
    announce = true;
  }

  /**
   * Need to bind to `exit` so we can remove DiscoveryService from registry
   */
  let bindCleanUp = () => {
    process.stdin.resume();//so the program will not close instantly

    // Exit handler
    let exitHandler = startup.exitHandlerFactory(ID, model);

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
    let descriptor = {
      type: 'DiscoveryService',
      healthCheckRoute: '/health',
      schemaRoute: '/swagger.json',
      timestamp: new Date(),
      id: ID,
      region: REGION,
      stage: STAGE,
      status: 'Online',
      version: VERSION
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

  /* Handle exit -- Only if announcing descriptor to self */
  if(announce === 'true')
    bindCleanUp();

  if(announce === true) {
    // Dispatch Proxy -- init / announce
    getMe().then((me) => {
      console.log(me);
      proxy.connect({addr:'http://0.0.0.0:7616'}, (p) => {
        p.bind({ descriptor: me, types: [] });
      });
    }).catch((err) => {
      console.log(err);
    });

    /** Health Check Schedule **/
    startup.scheduleHealthCheck(model, () => {
      return true;
    }, HEALTH_CHECK_INTERVAL);
  }

  /* Http Routes */
  startup.loadHttpRoutes(app, proxy);

  http.listen(config.port, () => {
    console.log(`listening on *:${config.port}`);
  });

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
        if(subscribers[key]) {
          subscribers[key].splice(socket);

          /** Clean it up 'bish' **/
          if(subscribers[key].length === 0) {
            //feeds[key].closeFeed();
            delete feeds[key];
            delete subscribers[key];
          }
        }
      }); // close on-disconnect

      if(query.types && query.types.length > 0) {
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
          model.onServiceChange(query.types, (err, change) => {
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
              debug(`Saved Service Descriptor in registry for ${service.id}`);
            }).error((err) => {
              debug('Error registering service');
              debug(error);
            });

            // Find services by types..
            model.findServicesByTypes(query.types).then((services) => {
              debug(services);
              services.forEach((service) => {
                debug(service);
                socket.emit('service.init', service);
              });
            });
          }
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
