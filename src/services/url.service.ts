import logger from "@configs/logger";
import db from "@models/db";
import env from "@configs/env";
import { createShortId } from '@utils/shortId';
import cacheService from "@services/cache.service";
import MetricsService from "@services/metrics.service";
import ResilientDatabaseService from "@services/resilientDatabase.service";

class UrlService {
    private static MAX_SHORT_ID_ATTEMPTS = 3;

    public static async createShortUrl(urlData: any): Promise<any> {
        try {
            logger.info('Creating short URL', { urlData });

            const { originalUrl } = urlData;

            // Check if URL already exists using resilient service
            const existingUrl = await ResilientDatabaseService.urlExists(originalUrl);
            
            if (existingUrl) {
                // Try to get existing URL data
                const existingData = await db.Url.findOne({
                    where: { originalUrl },
                    attributes: ['shortUrlId', 'originalUrl', 'createdAt', 'updatedAt']
                });
                
                if (existingData) {
                    logger.info('Short URL already exists', { existingData });
                    cacheService.cacheShortUrl(existingData.shortUrlId, existingData.originalUrl)
                        .catch(err => {
                            logger.error('Error caching existing short URL', { error: err, existingData });
                        });
                    return UrlService.parseResponseData(existingData);
                }
            }

            const shortUrlId = await UrlService.createUniqueShortId();

            // Use resilient database service for creation
            const newUrl = await ResilientDatabaseService.createUrl({
                originalUrl: originalUrl,
                shortUrlId: shortUrlId
            });

            MetricsService.recordUrlCreated();

            logger.info('Short URL created successfully', {
                shortUrlId: newUrl.shortUrlId,
                originalUrl: newUrl.originalUrl,
                source: newUrl.source
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

            // Use resilient database service for retrieval
            const urlResult = await ResilientDatabaseService.getUrl(shortId);

            if (!urlResult) {
                logger.warn('Short URL not found', { shortId });
                return null;
            }

            const duration = (Date.now() - startTime) / 1000;
            MetricsService.recordRedirect(urlResult.source as 'cache' | 'database', duration);

            // Fast Redis-based click counting (non-blocking)
            cacheService.incrementUrlClicks(shortId)
                .catch(err => {
                    logger.error('Error incrementing click count in Redis', { error: err, shortId });
                });

            return urlResult.originalUrl;
        } catch (error) {
            logger.error('Error retrieving original URL', { error, shortId });
            throw error;
        }
    }

    public static async getUrlStats(shortId: string): Promise<any> {
        try {
            logger.info('Retrieving URL stats', { shortId });

            // Use resilient database service for stats retrieval
            const stats = await ResilientDatabaseService.getUrlStats(shortId);

            if (!stats) {
                return null;
            }

            return stats;
        } catch (error) {
            logger.error('Error retrieving URL stats', { error, shortId });
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
