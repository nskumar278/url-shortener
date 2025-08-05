import { Router } from 'express';
import UrlController from '@controllers/url.controller';
import { urlValidations } from '@middlewares/validations';

const router = Router();

/**
 * @swagger
 * /api/v1/urls:
 *   post:
 *     summary: Create a new short URL
 *     description: Creates a new short URL for the provided original URL
 *     tags: [URL]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               originalUrl:
 *                 type: string
 *                 description: The original URL to be shortened
 *                 required: true
 *           examples:
 *               example1:
 *                   summary: Basic URL creation
 *                   value:
 *                     originalUrl: "https://www.example.com"
 *     responses:
 *       201:
 *         description: Short URL created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ShortUrl'
 *             example:
 *               success: true
 *               message: "Short URL created successfully"
 *               data:
 *                 shortUrlId: "abc123"
 *                 originalUrl: "https://www.example.com"
 *                 shortUrl: "https://short.url/abc123"
 *                 createdAt: "2025-08-04T10:30:00.000Z"
 *               timestamp: "2025-08-04T10:30:00.000Z"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
    '/',
    urlValidations.createShortUrl,
    UrlController.createShortUrl
);

/**
 * @swagger
 * /api/v1/urls/{shortUrlId}:
 *   get:
 *     summary: Get URL statistics
 *     description: Retrieves statistics for the given short URL ID
 *     tags: [URL]
 *     parameters:
 *       - in: path
 *         name: shortUrlId
 *         required: true
 *         description: The ID of the short URL to retrieve statistics for
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: URL statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/UrlStats'
 *             example:
 *               success: true
 *               message: "URL statistics retrieved successfully"
 *               data:
 *                 shortUrlId: "abc123"
 *                 originalUrl: "https://www.example.com"
 *                 shortUrl: "https://short.url/abc123"
 *                 clickCount: 100
 *                 createdAt: "2025-08-04T10:30:00.000Z"
 *                 lastAccessedAt: "2025-08-04T10:30:00.000Z"
 *               timestamp: "2025-08-04T10:30:00.000Z"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
    '/:shortUrlId',
    urlValidations.getUrlStats,
    UrlController.getUrlStats
);

export default router;