'use strict';
const config = require('config');

const Cluster = require('core-server').Cluster;

class DiscoveryCluster extends Cluster {
    constructor(announcement, options) {
        super('DiscoveryService', announcement, options);
    }

    onLoadAvg(cb) {
        this.on('load.avg.metric', cb);
    }

    onCpuPercentUsage(cb) {
        this.on('cpu.percent.usage.metric', cb);
    }
}

module.exports.Cluster = DiscoveryCluster;