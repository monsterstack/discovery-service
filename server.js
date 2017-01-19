'use strict';

const config = require('config');
const optimist = require('optimist');
const ServiceLifecycle = require('./libs/serviceLifecycle');
const express = require('express');
const path = require('path');
const startup = require('./libs/startup');

const main = () => {
  let Health = require('./libs/health.js');
  let healthCheckInterval = config.healthCheck.interval;

  let announce = false;
  let useRandomWorkerPort = false;
  let announcement = require('./announcement.json');

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
  let server = new Server(announcement.name, announcement, {
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
  });

  process.on('message', function(msg, socket) {
      if (msg !== 'sticky-session:connection') return;
      // Emulate a connection event on the server by emitting the
      // event with the connection the master sent us.
      server.getHttp().emit('connection', socket);
  });
}


if(require.main === module) {
  main();
}
