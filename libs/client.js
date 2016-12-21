'use strict';
const socketIOClient = require('socket.io-client');

const DiscoveryClient = (socket) => {
  let self = this;
  this.socket = socket;

  this.query = (types, resultHandler) => {
    console.log(`Performing query for types ${types}`)

    self.socket.on('service', resultHandler);
  }
}

const connect = (options) => {
    let socket = socketIOClient(options.host);

    socket.on('connect', handler.onConnect);
    // socket.on('event', handler.onEvent);
    socket.on('disconnect',  handler.onDisconnect);

    return new DiscoveryClient(socket);
}

module.exports.connect = connect;
