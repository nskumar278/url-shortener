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
}

export default IndexController.getInstance();