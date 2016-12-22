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
  const sha1 = require('sha1');
  const debug = require('debug')('discovery-service');
  const model = require('discovery-model').model;

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

  /* Http Routes */
  glob("./api/v1/routes/*.routes.js", {}, (err, files) => {
    files.forEach((file) => {
      console.log(file);
      require(file)(app);
    });
  });

  http.listen(config.port, () => {
    console.log(`listening on *:${config.port}`);
  });

  io.on('connection', (socket) => {
    console.log("Got connection..");

    socket.on('services:init', (msg) => {
      debug(msg);
      let query = msg;
      model.findServicesByTypes(query.types).then((services) => {
        console.log(services);
        services.forEach((service) => {
          debug(service);
          console.log(service);
          client.emit('service.init', service);
        });
      });
    });

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
          feeds[key].closeFeed();
          delete feeds[key];
          delete subscribers[key];
        }
      });

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
    });


  });
}

/* Method main - Ha */
if(require.main === module) {
  main();
}

module.exports.client = require('./libs/client');
