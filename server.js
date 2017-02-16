'use strict';

const config = require('config');
const optimist = require('optimist');
const express = require('express');
const path = require('path');
const _ = require('lodash');

/**
 * Start Server
 * Options:
 * --randomWorkerPort ( true or false ) Do we bind to a random port ( used for child process being managed by cluster )
 *                    or do we use the standard config.port.
 * --announce         ( true or false ) Do we announce ourselves to the Discovery Service
 * --discoveryHost ( Where do I Announce myself?  Where is my Discovery Service)
 * --overrides     ( path for config overrides )
 */
const main = () => {
  if(optimist.argv.overrides) {
    let overrides = require(optimist.argv.overrides);
    _.merge(config, overrides);
  }

  let startup = require('./libs/startup');
  let ServiceLifecycle = require('./libs/serviceLifecycle');


  let Health = require('./libs/health.js');
  let healthCheckInterval = config.healthCheck.interval;

  let announce = false;
  let useRandomWorkerPort = false;
  let announcement = require('./announcement.json');
  let typeQuery = require('./typeQuery.json');

  // Handle Arguments
  if(optimist.argv.randomWorkerPort === 'true') {
    useRandomWorkerPort = true;
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

  

  let Server = require('core-server').Server;
  let server = new Server(announcement.name, announcement, typeQuery, {
    discoveryHost: '0.0.0.0',
    discoveryPort: 7616,
    useRandomWorkerPort: useRandomWorkerPort
  });

  let exitHandlerFactory = require('discovery-proxy').exitHandlerFactory;

  /** Init and handle lifecycle **/
  server.init().then(() => {
    let app = server.getApp();
    // Set View Engine and Static Paths
    app.set('view engine', 'ejs');
    app.use('/portal', express.static(path.join(__dirname + '/portal')));
    app.use('/public', express.static(path.join(__dirname, 'public')));

    server.loadHttpRoutes();
    server.listen().then(() => {
      let io = server.getIo();
      let ioRedis = server.getIoRedis();

      // Service Lifecycle...
      let modelRepository = require('discovery-model').model;
      let serviceLifecycle = new ServiceLifecycle(io, ioRedis, modelRepository);

      // Feed Change
      serviceLifecycle.on('feed.change', (feeds) => {
        console.log("Feeds");
        console.log(Object.keys(feeds));
        app.feeds = feeds;
      });

      // Query Change
      serviceLifecycle.on('query.change', (queries) => {
        app.queries = queries;
      });

      // Subscriber Change
      serviceLifecycle.on('subscriber.change', (subscribers) => {
        app.subscribers = subscribers;
      });

      serviceLifecycle.on('service.added', (obj) => {
        console.log(`Service Added ${obj.feedKey} - ${obj.change.type}`);
      });
      serviceLifecycle.on('service.removed', (obj) => {
        console.log(`Service Removed ${obj.feedKey} - ${obj.change.type}`);
      });

      // https://www.npmjs.com/package/socketio-auth
      io.on('connection', (socket) => {
        /**
         * Listen for metric data from proxy.
         */
        socket.on('services:metrics', (msg) => {
          serviceLifecycle.handleMetrics(msg, socket);
        }); // -- close on-services:metrics

        socket.on('services:offline', (msg) => {
          serviceLifecycle.handleOffline(msg, socket);
        }); // -- close on-services:offline

        socket.on('services:online', (msg) => {
          serviceLifecycle.handleOnline(msg, socket);
        }); // -- close on-services:online

        socket.on('services:subscribe', (msg) => {
          serviceLifecycle.handleSubscribe(msg, socket);
        }); // -- close on-services:subscribe

        socket.on('services:init', (msg) => {
          serviceLifecycle.handleInit(msg, socket);
        }); // -- close on-services.init
      }); // -- close on-connection

      console.log(`Announce ${announce}`);
      if(announce === true) {
        console.log('Announcing Existence')
        server.announce(exitHandlerFactory, modelRepository);

        /** Health Check Schedule **/
        startup.scheduleHealthCheck(modelRepository, () => {
          return true;
        }, healthCheckInterval);
      }
    });
  }).catch((err) => {
    console.log(err);
  });
}


if(require.main === module) {
  main();
}
