'use strict';

const glob = require('glob');
const Promise = require('promise');
const uuid = require('node-uuid');

const optimist = require('optimist');
const authSetup = require('socketio-auth');



/**
 * Discovery Service is Responsible for pushing changes to
 * ServiceDescriptor(s) (i.e. route tables) to interested parties.
 *
 * Discovery Service also provides a Rest API to request said ServiceDescriptor(s) on demand.
 */
const main = () => {
  let config = require('config');
  let ServiceLifecycle = require('./libs/serviceLifecycle');
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

  console.log(`Starting Discovery Service on ${config.port}`);
  let app = require('express')();
  let http = require('http').Server(app);
  let io = require('socket.io')(http);
  let ioredis = require('socket.io-redis');

  let serviceLifecycle = new ServiceLifecycle(io, ioredis, model);

  /* Handle exit -- Only if announcing descriptor to self */
  if(announce === true)
    bindCleanUp();

  if(announce === true) {
    // Dispatch Proxy -- init / announce
    let announcement = require('./announcement.json');
    serviceLifecycle.getMe(id, announcement).then((me) => {
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
