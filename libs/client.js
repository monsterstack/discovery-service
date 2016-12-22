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

  query(types, resultHandler) {
    console.log(`Performing query for types ${types}`)
    console.log('Init');
    this.socket.emit('services:init', { types: types });
    console.log('Subscribe');
    this.socket.emit('services:subscribe', { types: types });

    let handler;
    if(resultHandler) {
      handler = resultHandler;
    } else {
      handler = (change) => {
        console.log(change);
      }
    }
    console.log("Listening for changes");
    this.socket.on('service.added', handler.added);
    this.socket.on('service.removed', handler.removed);
    this.socket.on('service.updated', handler.updated);
    this.socket.on('service.init', handler.init);
  }
}

const connect = (options, callback) => {
    let socket = socketIOClient(options.addr || 'http://localhost:7616');

    socket.on('connect', () => {
      callback(new DiscoveryClient(socket));
    });
}

module.exports.connect = connect;
