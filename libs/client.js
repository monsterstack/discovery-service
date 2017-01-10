'use strict';

const DEFAULT_ADDR = "http://localhost:7616";

const socketIOClient = require('socket.io-client');
/**
 * Discovery Client
 */
class DiscoveryClient {
  constructor(socket) {
    this.socket = socket;
  }

  onDisconnect(handler) {
    this.socket.on('disconnect', handler);
  }

  query(me, types, resultHandler) {
    console.log(`Performing query for types ${types}`);
    console.log('Init');
    this.socket.emit('services:init', { descriptor: me, types: types });
    console.log('Subscribe');
    this.socket.emit('services:subscribe', { types: types });

    let handler;
    if(resultHandler) {
      handler = resultHandler;
      console.log("Listening for changes");
      this.socket.removeListener('service.added', handler.added);
      this.socket.removeListener('service.removed', handler.removed);
      this.socket.removeListener('service.updated', handler.updated);
      this.socket.removeListener('service.init', handler.init);
      // Setup
      this.socket.on('service.added', handler.added);
      this.socket.on('service.removed', handler.removed);
      this.socket.on('service.updated', handler.updated);
      this.socket.on('service.init', handler.init);
    } else {
      console.log("*********** Missing handler **************");
    }

  }
}


const connect = (options, callback) => {
    let host = options.addr || 'http://localhost:7616';
    let socket = socketIOClient(host);
    let client = new DiscoveryClient(socket);

    client.onDisconnect(() => {
      console.log('Bye Bye Connection');
    });

    socket.on('connect', (conn) => {
      // socket.emit('authentication', {});
      // socket.on('authenticated', () => {
      //   callback(null, client);
      // });
      // socket.on('unauthorized', (err) => {
      //   callback(err);
      // });
      callback(null, client);
    });
}

module.exports.connect = connect;
