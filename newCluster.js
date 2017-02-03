'use strict';
const config = require('config');
const Cluster = require('core-server').Cluster;

const optimist = require('optimist');

const main = () => {
  console.log("Starting Cluster");
  let options = {};
  if(optimist.argv.numWorkers) {
    options.numWorkers = optimist.argv.numWorkers;
  }

  if(optimist.argv.discoveryHost) {
    options.discoveryHost = optimist.argv.discoveryHost;
  }

  let model = require('discovery-model').model;
  let proxy = require('discovery-proxy');

  let announcement = require('./announcement.json');
  let cluster = new Cluster("DiscoveryService", announcement, options);
  let exitHandler = proxy.exitHandlerFactory(cluster.id, model);
  cluster.bindExitHandler(exitHandler);

  cluster.start();
}


if(require.main === module) {
  main();
}
