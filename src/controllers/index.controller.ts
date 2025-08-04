import { Request, Response } from 'express';
import logger from '@configs/logger';
import { asyncErrorHandler } from '@middlewares/errorHandler';
import { ApiResponse } from '@interfaces/api.interface';
import indexService from '@services/index.service';

class IndexController {
    public static index = asyncErrorHandler(async (_req: Request, res: Response): Promise<void> => {
        logger.info('Index route accessed');

        const data = await indexService.getIndexData();

        const response: ApiResponse = {
            success: true,
            message: 'Welcome to URL Shortener API',
            data,
            timestamp: new Date().toISOString()
        };

        res.status(200).json(response);
    });
}

export default IndexController;