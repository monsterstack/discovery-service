'use strict';

const controller = require('../controllers/health.controller.js');

/** Public **/
module.exports = function(app) {
  app.get('/api/v1/health', controller.getHealth(app));
}
