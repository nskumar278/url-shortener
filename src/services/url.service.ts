import logger from "@configs/logger";
import db from "@models/db";
import env from "@configs/env";
import { createShortId } from '@utils/shortId';

class UrlService {
    private static MAX_SHORT_ID_ATTEMPTS = 3;

    public static async createShortUrl(urlData: any): Promise<any> {
        try {
            logger.info('Creating short URL', { urlData });

            const { originalUrl } = urlData;

            // Check if URL already exists
            const existingUrl = await db.Url.findOne({
                where: { originalUrl },
                attributes: ['shortUrlId', 'originalUrl', 'createdAt', 'updatedAt']
            });

            if (existingUrl) {
                logger.info('Short URL already exists', { existingUrl });
                return UrlService.parseResponseData(existingUrl);
            }

            const shortUrlId = await UrlService.createUniqueShortId();

            const newUrl = await db.Url.create({
                originalUrl: originalUrl,
                shortUrlId: shortUrlId,
                clickCount: 0
            });

            logger.info('Short URL created successfully', {
                shortUrlId: newUrl.shortUrlId,
                originalUrl: newUrl.originalUrl,
            });

            return UrlService.parseResponseData(newUrl);

        } catch (error) {
            logger.error('Error creating short URL', { error, urlData });
            throw error;
        }
    }

    public static async getOriginalUrl(shortId: string): Promise<string | null> {
        try {
            logger.info('Retrieving original URL for short ID', { shortId });
            const urlRecord = await db.Url.findOne({
                where: { shortUrlId: shortId },
                attributes: ['id', 'originalUrl', 'clickCount']
            });

            if (!urlRecord) {
                logger.warn('Short URL not found', { shortId });
                return null;
            }

            // Increment click count on the same instance
            await urlRecord.increment('clickCount');

            return urlRecord.originalUrl;
        } catch (error) {
            logger.error('Error retrieving original URL', { error, shortId });
            throw error;
        }
    }

    public static async getUrlStats(shortUrl: string): Promise<any> {
        try {
            logger.info('Getting stats for short URL', { shortUrl });
            const urlRecord = await db.Url.findOne({
                where: { shortUrlId: shortUrl },
                attributes: ['id', 'shortUrlId', 'originalUrl', 'clickCount', 'createdAt', 'updatedAt']
            });

            if (!urlRecord) {
                logger.warn('Short URL not found', { shortUrl });
                return null;
            }

            return UrlService.parseResponseData(urlRecord);
        } catch (error) {
            logger.error('Error getting URL stats', { error, shortUrl });
            throw error;
        }
    }

    private static async createUniqueShortId(): Promise<string> {

        let attempts = 0;
        let shortUrlId;

        while (attempts < this.MAX_SHORT_ID_ATTEMPTS) {

            shortUrlId = createShortId();

            const existingUrl = await db.Url.findOne({
                where: { shortUrlId },
                attributes: ['id']
            });

            if (!existingUrl) {
                return shortUrlId;
            }

            attempts++;
        }

        throw new Error('Failed to generate a unique short URL ID after multiple attempts');
    }

    private static parseResponseData(data?: any): {} {
        if (!data) return {};

        return {
            originalUrl: data.originalUrl,
            shortUrlId: data.shortUrlId,
            shortUrl: `${env.HOST}/${data.shortUrlId}`,
            clickCount: data.clickCount,
            createdAt: data.createdAt.toISOString(),
            lastAccessedAt: data.updatedAt.toISOString()
        };
    }
}

export default UrlService;
