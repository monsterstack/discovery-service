'use strict';

const controller = require('../controllers/services.controller.js');

/** Public **/
module.exports = function(app) {
  app.get('/api/v1/services', controller.getServices(app));
}
