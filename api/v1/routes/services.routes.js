'use strict';

const controller = require('../controllers/services.controller.js');

/** Public **/
module.exports = (app) => {
  /**
   * @swagger
   * /services:
   *  get:
   *    description: Get Health of Service
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: types
   *        description: Types of Services
   *        in: query
   *        required: false
   *        type: string
   *      - name: stageFilter
   *        description: Stage Filter
   *        in: query
   *        required: false
   *        type: string
   *      - name: regionFilter
   *        description: Region Filter
   *        in: query
   *        required: false
   *        type: string
   *      - name: page
   *        description: Page Number
   *        in: query
   *        required: false
   *        type: number
   *      - name: size
   *        description: Page size
   *        in: query
   *        type: number
   *    responses:
   *      200:
   *        description: PageResponse
   *        schema:
   *          $ref: '#/definitions/PageResponse'
   */
  app.get('/api/v1/services', controller.getServices(app));

  /**
   * @swagger
   * /services/{id}:
   *  get:
   *    description: Get Service By Id
   *    produces:
   *      - application/json
   *    parameters:
   *      - name: id
   *        description: Service Id
   *        in: path
   *        required: true
   *        type: string
   *    responses:
   *      200:
   *        description: ServiceDescriptor
   *        schema:
   *          $ref: '#/definitions/ServiceDescriptor'
   */
  app.get('/api/v1/services/:id', controller.getService(app));


}
