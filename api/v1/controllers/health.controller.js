'use strict';
const appRoot = require('app-root-path');
const HttpStatus = require('http-status');
const os = require('os');

const getHealth = (app) => {
  return (req, res) => {
    let loadAvg = os.loadavg();
    let cpus = os.cpus();
    let cpuMeasures = [];
    cpus.forEach((cpu) => {
      cpuMeasures.push(cpu.times);
    });
    res.status(HttpStatus.OK).send({
      cpus: cpuMeasures,
      load: loadAvg
    });
  }
}

/* Public */
exports.getHealth = getHealth;
