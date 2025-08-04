import { Request, Response } from 'express';
import logger from '@configs/logger';
import { asyncErrorHandler } from '@middlewares/errorHandler';
import { getAllSupportedVersions, getApiVersionInfo } from '@middlewares/versioning';
import { ApiResponse } from '@interfaces/api.interface';

class DocsController {
    public static getApiDocs = asyncErrorHandler(async (_req: Request, res: Response): Promise<void> => {
        logger.info('API documentation accessed');

        const supportedVersions = getAllSupportedVersions();
        const versionDetails = supportedVersions.reduce((acc, version) => {
            const info = getApiVersionInfo(version);
            acc[version] = {
                ...info,
                baseUrl: `/api/${version}`,
                endpoints: {
                    'GET /': 'Get API information',
                    'GET /health': 'Health check endpoint',
                    // Add more endpoints as you build them
                }
            };
            return acc;
        }, {} as Record<string, any>);

        const response: ApiResponse = {
            success: true,
            message: 'URL Shortener API Documentation',
            data: {
                title: 'URL Shortener API',
                description: 'A production-ready URL shortening service with analytics',
                contact: {
                    name: 'API Support',
                    email: 'support@urlshortener.com'
                },
                versions: versionDetails,
                authentication: {
                    type: 'Bearer Token',
                    description: 'Include Authorization header with Bearer token'
                },
                rateLimit: {
                    requests: 100,
                    window: '15 minutes'
                },
                errorCodes: {
                    400: 'Bad Request - Invalid input',
                    401: 'Unauthorized - Missing or invalid token',
                    403: 'Forbidden - Insufficient permissions',
                    404: 'Not Found - Resource not found',
                    409: 'Conflict - Resource already exists',
                    429: 'Too Many Requests - Rate limit exceeded',
                    500: 'Internal Server Error - Server error'
                }
            },
            timestamp: new Date().toISOString(),
        };

        res.status(200).json(response);
    });
}

export default DocsController;
