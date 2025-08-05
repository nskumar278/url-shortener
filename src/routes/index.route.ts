import { Router } from 'express';
import IndexController from '@controllers/index.controller';
import HealthController from '@controllers/health.controller';
import UrlController from '@controllers/url.controller';
import { urlValidations } from '@middlewares/validations';

const router = Router();

router.get('/', IndexController.index);
router.get('/favicon.ico', (_req, res) => {
    res.status(204).end();
});

/**
 * @swagger
 * /{shortUrlId}:
 *   get:
 *     summary: Redirect to original URL
 *     description: Redirects the user to the original URL associated with the given short URL ID
 *     tags: [URL]
 *     parameters:
 *       - in: path
 *         name: shortUrlId
 *         required: true
 *         description: The ID of the short URL
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirects to the original URL
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
    '/:shortUrlId',
    urlValidations.redirectToOriginalUrl,
    UrlController.redirectToOriginalUrl
)

// Health check endpoint
router.get('/health', HealthController.healthCheck);

export default router;