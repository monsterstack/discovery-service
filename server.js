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
  let app = require('express.io')();

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

  app.http().io();

  /* Http Routes */
  glob("./api/v1/routes/*.routes.js", {}, (err, files) => {
    files.forEach((file) => {
      console.log(file);
      require(file)(app);
    });
  });

  app.io.route('services:init', (req) => {
      debug(req);
      let query = req.data;
      model.findServicesByType(query.types).then((services) => {
        services.forEach((service) => {
          debug(service);
          req.io.emit('service', service);
        });
      });
  });

  app.io.route('services:subscribe', (req) => {
      debug(req);
      let query = req.data;
      let key = sha(JSON.stringify(query));

      /**
       * Bundle all connected clients based on interested query 'sha'
       * Also, keep track of the feed by query 'sha' such that the feed can
       * be closed when it's usefullness ceases to exist
       **/
      if(subscribers[key]) {
        subscribers[key].push(req);
      } else {
        subscribers[key] = [req];
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
              client.io.emit('service', change.change);
            });
          });
        });

        /**
         * Handle disconnect event.  In this situation we need to clean up
         * the client connections / subscriptions and close all feeds that
         * are no longer needed.
         */
        req.io.on('disconnect', (event) => {
            debug('Disconnect Event');
            debug(event);
            subscribers[key].splice(clientId);

            /** Clean it up 'bish' **/
            if(subscribers[key].length === 0) {
              feeds[key].closeFeed();
              delete feeds[key];
              delete subscribers[key];
            }
        });
      }
  });

  app.listen(config.port, '0.0.0.0');

}

/* Method main - Ha */
if(require.main === module) {
  main();
}

module.exports.client = require('./libs/client');
