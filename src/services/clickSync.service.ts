import logger from '@configs/logger';
import db from '@models/db';
import cacheService from '@services/cache.service';
import MetricsService from '@services/metrics.service';
import env from '@configs/env';

interface ClickSyncOptions {
    intervalSeconds?: number;
    batchSize?: number;
    retryAttempts?: number;
    retryDelayMs?: number;
}

class ClickSyncService {
    private static instance: ClickSyncService;
    private syncInterval: NodeJS.Timeout | null = null;
    private isRunning = false;
    private options: Required<ClickSyncOptions>;

    private constructor(options: ClickSyncOptions = {}) {
        this.options = {
            intervalSeconds: options.intervalSeconds || env.CLICK_SYNC_INTERVAL_SECONDS,
            batchSize: options.batchSize || env.CLICK_SYNC_BATCH_SIZE,
            retryAttempts: options.retryAttempts || env.CLICK_SYNC_RETRY_ATTEMPTS,
            retryDelayMs: options.retryDelayMs || env.CLICK_SYNC_RETRY_DELAY_MS
        };
    }

    public static getInstance(options?: ClickSyncOptions): ClickSyncService {
        if (!ClickSyncService.instance) {
            ClickSyncService.instance = new ClickSyncService(options);
        }
        return ClickSyncService.instance;
    }

    public start(): void {
        if (this.isRunning) {
            logger.warn('ClickSyncService is already running');
            return;
        }

        logger.info('Starting ClickSyncService', { 
            intervalSeconds: this.options.intervalSeconds,
            batchSize: this.options.batchSize 
        });

        this.isRunning = true;
        
        // Initial sync
        this.syncClickCounts().catch(err => {
            logger.error('Error in initial click sync', { error: err });
        });

        // Schedule periodic syncs
        this.syncInterval = setInterval(() => {
            this.syncClickCounts().catch(err => {
                logger.error('Error in periodic click sync', { error: err });
            });
        }, this.options.intervalSeconds * 1000);
    }

    public stop(): void {
        if (!this.isRunning) {
            logger.warn('ClickSyncService is not running');
            return;
        }

        logger.info('Stopping ClickSyncService');
        
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        
        this.isRunning = false;
    }

    public async syncClickCounts(): Promise<void> {
        const startTime = Date.now();
        
        try {
            logger.debug('Starting click count sync');

            // Get all click count keys from Redis
            const clickKeys = await cacheService.getClickCountKeys();
            
            if (clickKeys.length === 0) {
                logger.debug('No click counts to sync');
                return;
            }

            logger.info('Found click counts to sync', { count: clickKeys.length });

            // Process in batches to avoid overwhelming the database
            const batches = this.chunkArray(clickKeys, this.options.batchSize);
            let totalSynced = 0;
            let totalErrors = 0;

            for (const batch of batches) {
                try {
                    const synced = await this.processBatch(batch);
                    totalSynced += synced;
                } catch (error) {
                    totalErrors++;
                    logger.error('Error processing batch', { error, batchSize: batch.length });
                }
            }

            const duration = (Date.now() - startTime) / 1000;
            
            logger.info('Click count sync completed', {
                totalKeys: clickKeys.length,
                totalSynced,
                totalErrors,
                batches: batches.length,
                duration
            });

            // Record metrics
            MetricsService.recordDatabaseOperation('batch_update', duration);

        } catch (error) {
            const duration = (Date.now() - startTime) / 1000;
            logger.error('Error during click count sync', { error, duration });
            throw error;
        }
    }

    private async processBatch(clickKeys: string[]): Promise<number> {
        const startTime = Date.now();
        
        try {
            // Get all click counts for this batch
            const clickCounts = await cacheService.getBatchClickCounts(clickKeys);
            
            if (Object.keys(clickCounts).length === 0) {
                return 0;
            }

            // Start database transaction
            const transaction = await db.sequelize.transaction();
            
            try {
                let updatedCount = 0;

                // Update each URL's click count in the database
                for (const [shortUrlId, clickCount] of Object.entries(clickCounts)) {
                    if (clickCount > 0) {
                        await db.Url.increment('clickCount', {
                            by: clickCount,
                            where: { shortUrlId },
                            transaction
                        });
                        updatedCount++;
                    }
                }

                // Commit transaction
                await transaction.commit();

                // Delete processed keys from Redis
                await cacheService.deleteClickCounts(clickKeys);

                const duration = (Date.now() - startTime) / 1000;
                
                logger.debug('Batch processed successfully', {
                    batchSize: clickKeys.length,
                    updatedCount,
                    duration
                });

                return updatedCount;

            } catch (error) {
                // Rollback transaction on error
                await transaction.rollback();
                throw error;
            }

        } catch (error) {
            const duration = (Date.now() - startTime) / 1000;
            logger.error('Error processing click count batch', { 
                error, 
                batchSize: clickKeys.length,
                duration 
            });
            throw error;
        }
    }

    private chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    public getStatus(): { isRunning: boolean; options: Required<ClickSyncOptions> } {
        return {
            isRunning: this.isRunning,
            options: this.options
        };
    }

    // Manual sync trigger for testing/debugging
    public async forcSync(): Promise<void> {
        logger.info('Force sync triggered');
        await this.syncClickCounts();
    }
}

export default ClickSyncService;
