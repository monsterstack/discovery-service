'use strict';
const cluster = require('cluster');
const net = require('net');
const optimist = require('optimist');
const uuid = require('node-uuid');

const NAME = 'DiscoveryService';
const REGION = 'us-east-1';
const STAGE = 'dev';
const VERSION = 'v1';
const ID = uuid.v1();

const startup = require('./libs/startup');

const overrideLocation = null;
const numWorkers = null;

/**
 * Compute hash for 'sticky-session'
 * @param ip
 * @param seed
 * @return hash
 */
const hash = (ip, seed) => {
  let h = ip.reduce((r, num) => {
        r += parseInt(num, 10);
        r %= 2147483648;
        r += (r << 10)
        r %= 2147483648;
        r ^= r >> 6;
        return r;
    }, seed);

    h += h << 3;
    h %= 2147483648;
    h ^= hash >> 11;
    h += hash << 15;
    h %= 2147483648;

    return h >>> 0;
}

/**
 * Construct my announcement
 */
const getMe = (config) => {
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

/**
 * Bind an 'exitHandler' so we can clean-up on 'exit'
 */
const bindExitHandler = (exitHandler) => {
  //do something when app is closing
  process.on('exit', exitHandler.bind(null,{cleanup:true}));

  //catches ctrl+c event
  process.on('SIGINT', exitHandler.bind(null, {cleanup:true}));

  //catches uncaught exceptions
  process.on('uncaughtException', exitHandler.bind(null, {cleanup:true}));
}

/**
 * Method Main - Ha
 */
const main = () => {
  if(optimist.argv.override) {
    overrideLocation = optimist.argv.override;
  }

  if(optimist.argv.numWorkers) {
    numWorkers = parseInt(optimist.argv.numWorkers);
  }

  const clusterArgs = ['--use', 'http', '--randomWorkerPort', 'true'];

  cluster.schedulingPolicy = cluster.SCHED_RR;

  cluster.setupMaster({
    exec: 'server.js',
    args: clusterArgs,
    silent: false
  });


  let config = require('config');

  let proxy = require('discovery-proxy');
  let model = require('discovery-model').model;
  let numCPUs = numWorkers || require('os').cpus().length;

  let exitHandler = startup.exitHandlerFactory(ID, model);
  bindExitHandler(exitHandler);

  if (cluster.isMaster) {
      let workers = [];
      // Fork workers. One per CPU for maximum effectiveness
      for (let i = 0; i < numCPUs; i++) {
          !function spawn(i) {
              workers[i] = cluster.fork();

              workers[i].on('exit', function() {
                  console.error('sticky-session: worker died');
                  spawn(i);
              });

          }(i);
      }

      let seed = ~~(Math.random() * 1e9);

      cluster.on('listening', (worker, address) => {
          console.log('A worker is now connected to ' + address.address + ':' + address.port);
      });

      cluster.on('online', (worker) => {
          console.log("Worker is online");
      });

      let server = net.createServer({ pauseOnConnect: true }, (c) => {
          // Get int31 hash of ip
          let worker,
              ipIndex = hash((c.remoteAddress || '').split(/\./g), seed);
          // Pass connection to worker
          worker = workers[ipIndex%workers.length];
          worker.send('sticky-session:connection', c);
      });


      server.listen(config.port, () => {
        setTimeout(() => {
          //Dispatch Proxy -- init / announce
          getMe(config).then((me) => {
            console.log(me);
            proxy.connect({addr:'http://0.0.0.0:'+config.port}, (p) => {
              p.bind({ descriptor: me, types: [] });
            });
          }).catch((err) => {
            console.log("******************** Error **********")
            console.log(err);
          });
        }, 500);
      });
    }
}


if(require.main === module) {
  main();
}
