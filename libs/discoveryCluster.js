'use strict';
const config = require('config');

const Cluster = require('core-server').Cluster;

const LOAD_AVG_METRIC_KEY = 'load.avg.metric';
const CPU_PERCENT_USAGE_METRIC_KEY = 'cpu.percent.usage.metric';

class DiscoveryCluster extends Cluster {
    constructor(announcement, options) {
        super('DiscoveryService', announcement, options);
    }

    onLoadAvg(cb) {
        this.on(LOAD_AVG_METRIC_KEY, cb);
    }

    onCpuPercentUsage(cb) {
        this.on(CPU_PERCENT_USAGE_METRIC_KEY, cb);
    }

    /**
     * Send Metric to Long-term Storage and Analytics Pipeline
     * @param metric
     * 
     * Metric:
     * {
     *   name: String,
     *   value: Number,
     *   timestamp: Date
     * }
     */
    recordMetric(metric) {
        // Validate Metric and throw error if invalid.
        // We shall use metric service here.  Probably an advertised worker queue.  Thus validating
        // the payload against the json schema.
        console.log('sending metric to metric service');
    }
}

module.exports.Cluster = DiscoveryCluster;