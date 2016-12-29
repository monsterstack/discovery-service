'use strict';

const controller = require('../controllers/swagger.controller.js');

/** Public **/
module.exports = function(app) {
  app.get('/api/v1/swagger.json', controller.getSwagger(app));
}
