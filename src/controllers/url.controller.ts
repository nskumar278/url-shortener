import { Request, Response } from 'express';
import { ApiResponse } from '@interfaces/api.interface';
import { asyncErrorHandler } from '@middlewares/errorHandler';
import logger from '@configs/logger';
import UrlService from '@services/url.service';

class UrlController {
    public static createShortUrl = asyncErrorHandler(async (req: Request, res: Response): Promise<void> => {
        const urlData = req.body;
        logger.info('Create short URL endpoint accessed', { urlData });

        const newUrl = await UrlService.createShortUrl(urlData);

        const response: ApiResponse = {
            success: true,
            message: 'Short URL created successfully',
            data: newUrl,
            timestamp: new Date().toISOString()
        };

        res.status(201).json(response);
    });

    public static redirectToOriginalUrl = asyncErrorHandler(async (req: Request, res: Response): Promise<void> => {
        const shortId = req.params.shortUrlId;
        logger.info('Redirect to original URL endpoint accessed', { shortId });

        const originalUrl = await UrlService.getOriginalUrl(shortId);
        
        if (!originalUrl) {
            const response: ApiResponse = {
                success: false,
                message: 'Short URL not found',
                timestamp: new Date().toISOString()
            };
            res.status(404).json(response);
            return;
        }

        res.redirect(originalUrl);
    });

    public static getUrlStats = asyncErrorHandler(async (req: Request, res: Response): Promise<void> => {
        const shortUrlId = req.params.shortUrlId;
        logger.info('Get URL stats endpoint accessed', { shortUrlId });

        const stats = await UrlService.getUrlStats(shortUrlId);

        if (!stats) {
            const response: ApiResponse = {
                success: false,
                message: 'Short URL not found',
                timestamp: new Date().toISOString()
            };
            res.status(404).json(response);
            return;
        }

        const response: ApiResponse = {
            success: true,
            message: 'URL stats retrieved successfully',
            data: stats,
            timestamp: new Date().toISOString()
        };

        res.status(200).json(response);
    });
}

export default UrlController;