'use strict';

const controller = require('../controllers/constants.controller.js');

/** Public **/
module.exports = function(app) {
  /**
   * @swagger
   * /constants:
   *  get:
   *    description: Get Service Constants
   *    operationId: getConstants
   *    produces:
   *      - application/json
   *    responses:
   *      200:
   *        description: Constants
   *        type: object
   */
  app.get('/constants', controller.getConstants(app));
}
