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
   *    consumes:
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

  app.get('/api/v1/services/_types', controller.uniqueServiceTypes(app));
  /**
   * @swagger
   * /services/_count:
   *  get:
   *    description: Get Count of Services
   *    produces:
   *      - application/json
   *    consumes:
   *      - application/json
   *    parameters:
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
   *    responses:
   *      200:
   *        description: Count
   *        schema:
   *          $ref: '#/definitions/Count'
   */
  app.get('/api/v1/services/_count', controller.countServices(app));

  /**
   * @swagger
   * /services/{id}:
   *  get:
   *    description: Get Service By Id
   *    produces:
   *      - application/json
   *    consumes:
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

  /**
   * @swagger
   * /services/{id}:
   *  delete:
   *    description: Get Service By Id
   *    produces:
   *      - application/json
   *    consumes:
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
  app.delete('/api/v1/services/:id', controller.deleteService(app));

}
