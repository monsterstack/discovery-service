'use strict';

/**
 * @swagger
 * definitions:
 *   Error:
 *     type: object
 *     required:
 *        - errorMessage
 *     properties:
 *        errorMessage:
 *          type: string
 *   Health:
 *     type: object
 *     required:
 *        - cpuPercentUsage
 *        - loadAvg
 *     properties:
 *        cpuPercentUsage:
 *          type: number
 *        loadAvg:
 *          type: number
 *   ServiceType:
 *     type: object
 *     required:
 *       - type
 *     properties:
 *        type:
 *          type: string
 *   PageDescriptor:
 *     type: object
 *     required:
 *       - page
 *       - size
 *       - total
 *     properties:
 *        page:
 *          type: integer
 *          format: int64
 *        size:
 *          type: integer
 *          format: int64
 *        total:
 *          type: integer
 *          format: int64
 *   PageResponse:
 *     type: object
 *     required:
 *       - page
 *       - elements
 *     properties:
 *       page:
 *          type: object
 *          schema:
 *            $ref: '#/definitions/PageDescriptor'
 *       elements:
 *          type: array
 *          $ref: '#/definitions/ServiceDescriptor'
 *   Count:
 *     type: object
 *     required:
 *       - count
 *     properties:
 *       count:
 *          type: integer
 *          format: int64
 *   ServiceDescriptor:
 *     type: object
 *     required:
 *       - username
 *       - version
 *       - type
 *       - healthCheckRoute
 *       - schemaRoute
 *       - docsRoute
 *       - status
 *       - region
 *       - stage
 *     properties:
 *       id:
 *         type: string
 *       version:
 *         type: string
 *       type:
 *         type: string
 *       healthCheckRoute:
 *         type: string
 *       schemaRoute:
 *         type: string
 *       docsRoute:
 *         type: string
 *       timestamp:
 *         type: number
 *         format: date
 *       status:
 *         type: string
 *       region:
 *         type: string
 *       stage:
 *         type: string
 *       rtimes:
 *         type: array
 *         items:
 *            type: number
 *       avgTime:
 *         type: number
 */
