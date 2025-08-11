import logger from "@configs/logger";
import db from "@models/db";
import env from "@configs/env";
import { createShortId } from '@utils/shortId';
import cacheService from "@services/cache.service";
import MetricsService from "@services/metrics.service";

class UrlService {
    private static MAX_SHORT_ID_ATTEMPTS = 3;

    public static async createShortUrl(urlData: any): Promise<any> {
        try {
            logger.info('Creating short URL', { urlData });

            const { originalUrl } = urlData;

            // Check if URL already exists
            const startDbTime = Date.now();
            const existingUrl = await db.Url.findOne({
                where: { originalUrl },
                attributes: ['shortUrlId', 'originalUrl', 'createdAt', 'updatedAt']
            });
            MetricsService.recordDatabaseOperation('select', (Date.now() - startDbTime) / 1000);

            if (existingUrl) {
                logger.info('Short URL already exists', { existingUrl });
                cacheService.cacheShortUrl(existingUrl.shortUrlId, existingUrl.originalUrl)
                    .catch(err => {
                        logger.error('Error caching existing short URL', { error: err, existingUrl });
                    });
                return UrlService.parseResponseData(existingUrl);
            }

            const shortUrlId = await UrlService.createUniqueShortId();

            const startCreateTime = Date.now();
            const newUrl = await db.Url.create({
                originalUrl: originalUrl,
                shortUrlId: shortUrlId,
                clickCount: 0
            });
            MetricsService.recordDatabaseOperation('insert', (Date.now() - startCreateTime) / 1000);
            MetricsService.recordUrlCreated();

            logger.info('Short URL created successfully', {
                shortUrlId: newUrl.shortUrlId,
                originalUrl: newUrl.originalUrl,
            });

            cacheService.cacheShortUrl(newUrl.shortUrlId, newUrl.originalUrl)
                .catch(err => {
                    logger.error('Error caching new short URL', { error: err, newUrl });
                });

            return UrlService.parseResponseData(newUrl);

        } catch (error) {
            logger.error('Error creating short URL', { error, urlData });
            throw error;
        }
    }

    public static async getOriginalUrl(shortId: string): Promise<string | null> {
        const startTime = Date.now();
        try {
            logger.info('Retrieving original URL for short ID', { shortId });

            const cachedUrl = await cacheService.getShortUrl(shortId);

            if (cachedUrl) {
                const duration = (Date.now() - startTime) / 1000;
                MetricsService.recordRedirect('cache', duration);
                
                // Fast Redis-based click counting (non-blocking)
                cacheService.incrementUrlClicks(shortId)
                    .catch(err => {
                        logger.error('Error incrementing click count in Redis for cached URL', { error: err, shortId });
                    });
                
                return cachedUrl;
            }

            const startDbTime = Date.now();
            const urlRecord = await db.Url.findOne({
                where: { shortUrlId: shortId },
                attributes: ['originalUrl', 'clickCount']
            });
            MetricsService.recordDatabaseOperation('select', (Date.now() - startDbTime) / 1000);

            if (!urlRecord) {
                logger.warn('Short URL not found', { shortId });
                return null;
            }

            const duration = (Date.now() - startTime) / 1000;
            MetricsService.recordRedirect('database', duration);

            cacheService.cacheShortUrl(shortId, urlRecord.originalUrl)
                .catch(err => {
                    logger.error('Error caching original URL after DB fetch', { error: err, shortId });
                });

            // Fast Redis-based click counting (non-blocking)
            cacheService.incrementUrlClicks(shortId)
                .catch(err => {
                    logger.error('Error incrementing click count in Redis', { error: err, shortId });
                });

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

            // Get pending click count from Redis
            const pendingClicks = await cacheService.getUrlClickCount(shortUrl);
            
            // Combine database and Redis click counts for accurate stats
            const totalClickCount = urlRecord.clickCount + pendingClicks;
            
            logger.debug('Click count calculation', {
                shortUrl,
                dbClickCount: urlRecord.clickCount,
                pendingClicks,
                totalClickCount
            });

            return UrlService.parseResponseData({
                ...urlRecord.toJSON(),
                clickCount: totalClickCount
            });
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
