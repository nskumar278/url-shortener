import { Request, Response } from 'express';
import logger from '@configs/logger';
import { asyncErrorHandler } from '@middlewares/errorHandler';
import { ApiResponse } from '@interfaces/api.interface';
import indexService from '@services/index.service';

class IndexController {
    private static instance: IndexController;

    private constructor() {}

    public static getInstance(): IndexController {
        if (!IndexController.instance) {
            IndexController.instance = new IndexController();
        }
        return IndexController.instance;
    }

    public index = asyncErrorHandler(async (_req: Request, res: Response): Promise<void> => {
        logger.info('Index route accessed');

        const message = await indexService.getIndexData();

        const response: ApiResponse = {
            success: true,
            message: message,
            timestamp: new Date().toISOString(),
        };

        res.status(200).json(response);
    });

    public healthCheck = asyncErrorHandler(async (_req: Request, res: Response): Promise<void> => {
        logger.info('Health check route accessed');

        const response: ApiResponse = {
            success: true,
            message: 'API is healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        };

        res.status(200).json(response);
    });

    public getDocs = asyncErrorHandler(async (_req: Request, res: Response): Promise<void> => {
        logger.info('API documentation route accessed');

        const response: ApiResponse = {
            success: true,
            message: 'API documentation available',
            data: {
                title: 'URL Shortener API Documentation',
                description: 'A production-ready URL shortening service with analytics',
                contact: {
                    name: 'API Support',
                    email: 'support@example.com'
                }
            },
            timestamp: new Date().toISOString(),
        };

        res.status(200).json(response);
    });
}

export default IndexController.getInstance();