import { Request, Response } from 'express';
import logger from '@configs/logger';
import { asyncErrorHandler } from '@middlewares/errorHandler';
import { ApiResponse } from '@interfaces/api.interface';

class HealthController {
    public static healthCheck = asyncErrorHandler(async (_req: Request, res: Response): Promise<void> => {
        logger.info('Health check accessed');

        const response: ApiResponse = {
            success: true,
            message: 'API is healthy',
            data: {
                status: 'ok',
                environment: process.env.NODE_ENV || 'development',
                version: process.env.npm_package_version || '1.0.0',
                database: 'connected', // Add actual DB health check here
                cache: 'connected' // Add actual cache health check here
            },
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString()
        };

        res.status(200).json(response);
    });
}

export default HealthController;
