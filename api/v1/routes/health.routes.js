'use strict';

const controller = require('../controllers/health.controller.js');

/** Public **/
module.exports = (app) => {
  /**
   * @swagger
   * /health:
   *  get:
   *    description: Get Health of Service
   *    tags:
   *      - health
   *    produces:
   *      - application/json
   *    consumes:
   *      - application/json
   *    responses:
   *      200:
   *        description: Health
   *        type: object
   *        schema:
   *          $ref: '#/definitions/Health'
   */
  app.get('/health', controller.getHealth(app));
}
