'use strict';
const HttpStatus = require('http-status');
const controller = require('../controllers/services.controller.js');

/** Public **/
module.exports = (app) => {
  /**
   * @swagger
   * /services:
   *  get:
   *    description: Get Health of Service
   *    tags:
   *      - services
   *    operationId: getServices
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

  /**
   * @swagger
   * /services/_types:
   *  get:
   *    description: Get Unique Service Types
   *    tags:
   *      - services
   *    operationId: uniqueServiceTypes
   *    produces:
   *      - application/json
   *    consumes:
   *      - application/json
   *    responses:
   *      200:
   *        description: ServiceTypes
   *        type: array
   *        items:
   *          schema:
   *            $ref: '#/definitions/ServiceType'
   */
  app.get('/api/v1/services/_types', controller.uniqueServiceTypes(app));

  /**
   * @swagger
   * /services/_count:
   *  get:
   *    description: Get Count of Services
   *    tags:
   *      - services
   *    operationId: count
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
   *    tags:
   *      - services
   *    operationId: getServiceById
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
   *    operationId: deleteServiceById
   *    tags:
   *      - services
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


  app.get('/feeds', (req, res) => {
    let queries = [];
    if(app.feeds) {
      let keys = Object.keys(app.feeds);
      for(let i in keys)
        queries.push({ key: keys[i], query: app.feeds[keys[i]].query });
    }
    res.status(HttpStatus.OK).send(queries);
  });

  app.get('/subscribers', (req, res) => {
    let subscribers = [];
    if(app.subscribers) {
      let keys = Object.keys(app.subscribers);
      for(let i in keys)
        subscribers.push({ key: keys[i], subscribers: app.subscribers[keys[i]] });
    }
    res.status(HttpStatus.OK).send(subscribers);
  });

  app.get('/queries', (req, res) => {
    let queries = {};
    if(app.queries) {
      queries = app.queries;
    }
    res.status(HttpStatus.OK).send(queries);
  });

}
