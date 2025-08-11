import db from '@models/db';
import cacheService from '@services/cache.service';
import CircuitBreakerManager, { DEFAULT_CONFIGS, CircuitBreakerOpenError } from '@services/circuitBreaker.service';
import logger from '@configs/logger';
import MetricsService from '@services/metrics.service';

/**
 * Resilient Database Service with Circuit Breaker Pattern
 * Provides graceful degradation for database operations
 */
class ResilientDatabaseService {
    private dbCircuitBreaker;
    private cacheCircuitBreaker;

    constructor() {
        // Database circuit breaker with health check
        this.dbCircuitBreaker = CircuitBreakerManager.getCircuitBreaker(
            'database',
            DEFAULT_CONFIGS.database,
            this.databaseHealthCheck.bind(this)
        );

        // Cache circuit breaker with health check
        this.cacheCircuitBreaker = CircuitBreakerManager.getCircuitBreaker(
            'cache',
            DEFAULT_CONFIGS.cache,
            this.cacheHealthCheck.bind(this)
        );
    }

    /**
     * Database health check
     */
    private async databaseHealthCheck(): Promise<boolean> {
        try {
            await db.sequelize.authenticate();
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Cache health check
     */
    private async cacheHealthCheck(): Promise<boolean> {
        try {
            return await cacheService.healthCheck();
        } catch {
            return false;
        }
    }


    /**
     * Check if URL exists (lightweight operation)
     */
    async urlExists(originalUrl: string): Promise<boolean> {
        const operation = async () => {
            const startTime = Date.now();
            
            try {
                const exists = await db.Url.findOne({
                    where: { originalUrl },
                    attributes: ['id']
                });

                MetricsService.recordDatabaseOperation('select', (Date.now() - startTime) / 1000);
                return !!exists;
            } catch (error) {
                MetricsService.recordDatabaseOperation('select', (Date.now() - startTime) / 1000);
                throw error;
            }
        };

        const fallback = async () => {
            logger.warn('Database unavailable - cannot check URL existence');
            return false; // Assume URL doesn't exist when DB is down
        };

        try {
            return await this.dbCircuitBreaker.execute(operation, fallback);
        } catch {
            return false;
        }
    }


    /**
     * Resilient URL creation with fallback strategy
     */
    async createUrl(urlData: { originalUrl: string; shortUrlId: string }): Promise<any> {
        const operation = async () => {
            const startTime = Date.now();
            
            try {
                // Primary: Create in database
                const newUrl = await db.Url.create({
                    originalUrl: urlData.originalUrl,
                    shortUrlId: urlData.shortUrlId,
                    clickCount: 0
                });

                MetricsService.recordDatabaseOperation('insert', (Date.now() - startTime) / 1000);
                
                // Async cache the URL (non-blocking)
                this.cacheUrlAsync(urlData.shortUrlId, urlData.originalUrl);
                
                return {
                    originalUrl: newUrl.originalUrl,
                    shortUrlId: newUrl.shortUrlId,
                    clickCount: newUrl.clickCount,
                    createdAt: newUrl.createdAt,
                    updatedAt: newUrl.updatedAt,
                    source: 'database'
                };
            } catch (error) {
                MetricsService.recordDatabaseOperation('insert', (Date.now() - startTime) / 1000);
                throw error;
            }
        };

        const fallback = async () => {
            logger.warn('Database unavailable - using cache-only fallback for URL creation');
            
            // Fallback: Store only in cache with longer TTL
            await this.cacheCircuitBreaker.execute(async () => {
                await cacheService.set(`url:${urlData.shortUrlId}`, JSON.stringify({
                    originalUrl: urlData.originalUrl,
                    shortUrlId: urlData.shortUrlId,
                    clickCount: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    source: 'cache_fallback'
                }), { ttl: 86400 }); // 24 hours TTL for fallback

                // Also cache the short URL mapping
                await cacheService.cacheShortUrl(urlData.shortUrlId, urlData.originalUrl, 86400);
            });

            return {
                originalUrl: urlData.originalUrl,
                shortUrlId: urlData.shortUrlId,
                clickCount: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                source: 'cache_fallback',
                warning: 'Created in cache only - will be persisted when database recovers'
            };
        };

        return await this.dbCircuitBreaker.execute(operation, fallback);
    }

    /**
     * Resilient URL retrieval with multi-layer fallback
     */
    async getUrl(shortUrlId: string): Promise<{ originalUrl: string; source: string } | null> {
        // Layer 1: Try cache first (fastest)
        try {
            const cached = await this.cacheCircuitBreaker.execute(async () => {
                return await cacheService.getShortUrl(shortUrlId);
            });

            if (cached) {
                logger.debug('URL retrieved from cache', { shortUrlId });
                return { originalUrl: cached, source: 'cache' };
            }
        } catch (error) {
            logger.warn('Cache unavailable for URL retrieval', { 
                shortUrlId, 
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }

        // Layer 2: Try database with circuit breaker
        const dbOperation = async () => {
            const startTime = Date.now();
            
            try {
                const urlRecord = await db.Url.findOne({
                    where: { shortUrlId },
                    attributes: ['originalUrl']
                });

                MetricsService.recordDatabaseOperation('select', (Date.now() - startTime) / 1000);

                if (!urlRecord) {
                    return null;
                }

                // Async cache the result (non-blocking)
                this.cacheUrlAsync(shortUrlId, urlRecord.originalUrl);

                return { originalUrl: urlRecord.originalUrl, source: 'database' };
            } catch (error) {
                MetricsService.recordDatabaseOperation('select', (Date.now() - startTime) / 1000);
                throw error;
            }
        };

        const fallback = async () => {
            logger.warn('Database unavailable for URL retrieval - checking cache fallback', { shortUrlId });
            
            // Layer 3: Try cache fallback data
            try {
                const fallbackData = await this.cacheCircuitBreaker.execute(async () => {
                    const data = await cacheService.get(`url:${shortUrlId}`);
                    return data ? JSON.parse(data) : null;
                });

                if (fallbackData) {
                    return { originalUrl: fallbackData.originalUrl, source: 'cache_fallback' };
                }
            } catch (error) {
                logger.error('Cache fallback failed', { 
                    shortUrlId, 
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }

            return null;
        };

        try {
            return await this.dbCircuitBreaker.execute(dbOperation, fallback);
        } catch (error) {
            if (error instanceof CircuitBreakerOpenError) {
                return await fallback();
            }
            throw error;
        }
    }

    /**
     * Resilient URL statistics with degraded mode
     */
    async getUrlStats(shortUrlId: string): Promise<any> {
        const operation = async () => {
            const startTime = Date.now();
            
            try {
                const urlRecord = await db.Url.findOne({
                    where: { shortUrlId },
                    attributes: ['id', 'shortUrlId', 'originalUrl', 'clickCount', 'createdAt', 'updatedAt']
                });

                MetricsService.recordDatabaseOperation('select', (Date.now() - startTime) / 1000);

                if (!urlRecord) {
                    return null;
                }

                // Get pending clicks from Redis
                let pendingClicks = 0;
                try {
                    pendingClicks = await this.cacheCircuitBreaker.execute(async () => {
                        return await cacheService.getUrlClickCount(shortUrlId);
                    });
                } catch {
                    logger.warn('Could not retrieve pending click count', { shortUrlId });
                }

                return {
                    ...urlRecord.toJSON(),
                    clickCount: urlRecord.clickCount + pendingClicks,
                    source: 'database'
                };
            } catch (error) {
                MetricsService.recordDatabaseOperation('select', (Date.now() - startTime) / 1000);
                throw error;
            }
        };

        const fallback = async () => {
            logger.warn('Database unavailable - providing degraded URL stats', { shortUrlId });
            
            try {
                const fallbackData = await this.cacheCircuitBreaker.execute(async () => {
                    const data = await cacheService.get(`url:${shortUrlId}`);
                    return data ? JSON.parse(data) : null;
                });

                if (fallbackData) {
                    const pendingClicks = await cacheService.getUrlClickCount(shortUrlId);
                    
                    return {
                        ...fallbackData,
                        clickCount: (fallbackData.clickCount || 0) + pendingClicks,
                        source: 'cache_fallback',
                        warning: 'Statistics may be incomplete - database unavailable'
                    };
                }
            } catch (error) {
                logger.error('Cache fallback failed for stats', { 
                    shortUrlId, 
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }

            return {
                error: 'Service temporarily unavailable',
                shortUrlId,
                source: 'error_fallback'
            };
        };

        return await this.dbCircuitBreaker.execute(operation, fallback);
    }

    /**
     * Async cache operation (non-blocking)
     */
    private cacheUrlAsync(shortUrlId: string, originalUrl: string): void {
        this.cacheCircuitBreaker.execute(async () => {
            await cacheService.cacheShortUrl(shortUrlId, originalUrl);
        }).catch(error => {
            logger.warn('Async caching failed', { shortUrlId, error: error.message });
        });
    }

    /**
     * Get circuit breaker status for monitoring
     */
    getCircuitBreakerStatus() {
        return {
            database: this.dbCircuitBreaker.getStats(),
            cache: this.cacheCircuitBreaker.getStats()
        };
    }
}

export default new ResilientDatabaseService();
