'use strict';
const config = require('config');
const Cluster = require('core-server').Cluster;
const startup = require('./libs/startup');
const optimist = require('optimist');

/**
 * Start Cluster
 * --numWorkers       How many child processes do we manager?  Default matches the number of cpu cores available.
 * --discoveryHost ( Where do I Announce myself?  Where is my Discovery Service)
 */
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

  let healthCheckInterval = config.healthCheck.interval;

  /** Health Check Schedule **/
  let masterCheck = () => {
    return cluster.iAmMaster;
  };

  startup.scheduleHealthCheck(model, masterCheck, healthCheckInterval);
  /**
  setInterval(() => {
    cluster.announce();
  }, 5*60*1000);
  **/
}


if(require.main === module) {
  main();
}
