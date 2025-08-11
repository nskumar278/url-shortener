import { Request, Response } from 'express';
import logger from '@configs/logger';
import { asyncErrorHandler } from '@middlewares/errorHandler';
import { ApiResponse } from '@interfaces/api.interface';
import db from '@models/db';
import cacheService from '@services/cache.service';
import ClickSyncService from '@services/clickSync.service';
import ConnectionPoolService from '@services/connectionPool.service';
import env from '@configs/env';

class HealthController {
    public static healthCheck = asyncErrorHandler(async (_req: Request, res: Response): Promise<void> => {

        // Check database connectivity
        let databaseStatus = 'disconnected';
        let databaseError = null;
        try {
            await db.sequelize.authenticate();
            databaseStatus = 'connected';
        } catch (error) {
            databaseError = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Database health check failed', { error });
        }

        // Check Redis connectivity
        let cacheStatus = 'disconnected';
        let cacheError = null;
        try {
            const isHealthy = await cacheService.healthCheck();
            cacheStatus = isHealthy ? 'connected' : 'disconnected';
        } catch (error) {
            cacheError = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Cache health check failed', { error });
        }

        // Check click sync service status
        const clickSyncStatus = ClickSyncService.getInstance().getStatus();

        // Get connection pool stats
        const connectionPoolStats = ConnectionPoolService.getPoolStats();

        // Get pending click counts in Redis
        let pendingClicks = 0;
        try {
            const clickKeys = await cacheService.getClickCountKeys();
            pendingClicks = clickKeys.length;
        } catch (error) {
            logger.error('Error getting pending click counts', { error });
        }

        const isHealthy = databaseStatus === 'connected' && cacheStatus === 'connected';
        const status = isHealthy ? 'healthy' : 'degraded';

        const response: ApiResponse = {
            success: true,
            message: `API is ${status}`,
            data: {
                status,
                version: '1.0.0',
                uptime: Math.floor(process.uptime()),
                database: {
                    status: databaseStatus,
                    error: databaseError,
                    connectionPool: connectionPoolStats ? {
                        total: connectionPoolStats.total,
                        idle: connectionPoolStats.idle,
                        used: connectionPoolStats.used,
                        waiting: connectionPoolStats.waiting,
                        utilization: connectionPoolStats.max > 0 ? 
                            `${((connectionPoolStats.used / connectionPoolStats.max) * 100).toFixed(1)}%` : '0%'
                    } : null
                },
                cache: {
                    status: cacheStatus,
                    error: cacheError
                },
                clickSync: {
                    enabled: env.ENABLE_CLICK_SYNC,
                    isRunning: clickSyncStatus.isRunning,
                    config: env.ENABLE_CLICK_SYNC ? clickSyncStatus.options : null,
                    pendingClicks
                }
            },
            timestamp: new Date().toISOString()
        };

        const statusCode = isHealthy ? 200 : 503;
        res.status(statusCode).json(response);
    });
}

export default HealthController;
