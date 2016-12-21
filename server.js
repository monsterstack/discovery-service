const config = require('config');
const sha1 = require('sha1');

const model = require('discovery-model').model;

/**
 * Discovery Service is Responsible for pushing changes to
 * ServiceDescriptor(s) (i.e. route tables) to interested parties.
 *
 * Discovery Service also provides a Rest API to request said ServiceDescriptor(s) on demand.
 */
const main = () => {
  console.log("Starting Discovery Service");
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

  app.http().io();

  app.listen(config.port, '0.0.0.0');

  app.io.route('services', {
    'subscribe': (req) => {
      let query = req.message;
      let clientId = req.clientId;
      let key = sha(JSON.stringify(query));

      if(subscribers[key]) {
        subscribers[key].push(clientId);
      } else {
        subscribers[key] = [clientId];

        /* Start Query --
         * Need some handle on this so we can kill the query when all interested parties disconnect
         */
        model.onChange(query, (err, change) => {
          subscribers.forEach((clientId) => {
            app.io.emit(clientId, change);
          });
        });
      }
    }
  });
}

if(require.main === module) {
  main();
}
