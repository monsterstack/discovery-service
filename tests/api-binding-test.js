'use strict';
const ApiBinding = require('discovery-proxy').ApiBinding;
const assert = require('assert');

describe('discovery-api-binding', () => {
  let Server = require('core-server').Server;
  let server = null;
  before((done) => {
    server = new Server("DiscoveryService", null, null, {});

    server.init().then(() => {
      server.loadHttpRoutes();
      server.listen().then(() => {
        console.log('Up and running..');
        done();
      }).catch((err) => {
        console.log(err);
        done();
      });
    }).catch((err) => {
      console.log(err);
      done();
    });

  });

  it('api created when binding occurs', (done) => {

    let service = {
      endpoint: 'http://localhost:7616',
      schemaRoute: '/swagger.json'
    };
    console.log("Creating Binding");
    let apiBinding = new ApiBinding(service);

    apiBinding.bind().then((service) => {
      console.log(`Checking Api...`);
      if(service.api === undefined) {
        console.log("Api is Null");
        done(new Error("Api is null"));
      } else if(service.api.health === undefined) {
        done(new Error("Api Health is null"));
      } else if(service.api.services === undefined) {
        done(new Error("Api Services is null"));
      } else {
        done();
      }
    }).catch((err) => {
      assert(err === undefined, "Error didn't occur");
      done(err);
    });

  }).timeout(2000);

  after(() => {

  });

});
