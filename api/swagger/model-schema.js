'use strict';

/**
 * @swagger
 * definitions:
 *   Page:
 *     type: object
 *     required:
 *       - page
 *       - size
 *     properties:
 *        page:
 *          type: integer
 *          format: int64
 *        size:
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
 *
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
