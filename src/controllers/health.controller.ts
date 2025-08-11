import { Request, Response } from 'express';
import logger from '@configs/logger';
import { asyncErrorHandler } from '@middlewares/errorHandler';
import { ApiResponse } from '@interfaces/api.interface';
import db from '@models/db';
import cacheService from '@services/cache.service';
import ClickSyncService from '@services/clickSync.service';
import ConnectionPoolService from '@services/connectionPool.service';
import circuitBreakerManager from '@services/circuitBreaker.service';
import MemoryProfilerService from '@services/memoryProfiler.service';
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

        // Get circuit breaker status
        const circuitBreakerStatus = circuitBreakerManager.getAllStats();

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
                },
                circuitBreakers: circuitBreakerStatus
            },
            timestamp: new Date().toISOString()
        };

        const statusCode = isHealthy ? 200 : 503;
        res.status(statusCode).json(response);
    });

    public static memoryProfile = asyncErrorHandler(async (_req: Request, res: Response): Promise<void> => {
        
        const memoryProfiler = MemoryProfilerService.getInstance();
        const profilingSummary = memoryProfiler.getProfilingSummary();
        const componentMemory = memoryProfiler.getComponentMemoryUsage();

        const response: ApiResponse = {
            success: true,
            message: 'Memory profile retrieved successfully',
            data: {
                summary: profilingSummary,
                detailed: componentMemory,
                actions: {
                    forceGC: '/api/v1/memory/gc',
                    heapSnapshot: '/api/v1/memory/snapshot',
                    baseline: '/api/v1/memory/baseline'
                }
            },
            timestamp: new Date().toISOString()
        };

        const statusCode = profilingSummary.status === 'critical' ? 503 : 200;
        res.status(statusCode).json(response);
    });

    public static forceGarbageCollection = asyncErrorHandler(async (_req: Request, res: Response): Promise<void> => {
        
        const memoryProfiler = MemoryProfilerService.getInstance();
        const beforeMemory = memoryProfiler.getCurrentMemoryStats();
        const gcPerformed = memoryProfiler.forceGarbageCollection();
        const afterMemory = memoryProfiler.getCurrentMemoryStats();

        const response: ApiResponse = {
            success: gcPerformed,
            message: gcPerformed ? 'Garbage collection performed' : 'Garbage collection not available',
            data: {
                gcPerformed,
                beforeMemory: beforeMemory.formatted,
                afterMemory: afterMemory.formatted,
                memoryFreed: gcPerformed ? {
                    rss: beforeMemory.rss - afterMemory.rss,
                    heapUsed: beforeMemory.heapUsed - afterMemory.heapUsed
                } : null
            },
            timestamp: new Date().toISOString()
        };

        res.status(gcPerformed ? 200 : 503).json(response);
    });

    public static createMemoryBaseline = asyncErrorHandler(async (_req: Request, res: Response): Promise<void> => {
        
        const memoryProfiler = MemoryProfilerService.getInstance();
        memoryProfiler.captureBaseline();
        const currentStats = memoryProfiler.getCurrentMemoryStats();

        const response: ApiResponse = {
            success: true,
            message: 'Memory baseline captured',
            data: {
                baseline: currentStats.formatted,
                timestamp: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
        };

        res.status(200).json(response);
    });

    public static generateHeapSnapshot = asyncErrorHandler(async (_req: Request, res: Response): Promise<void> => {
        
        const memoryProfiler = MemoryProfilerService.getInstance();
        const snapshotPath = memoryProfiler.generateHeapSnapshot();

        const response: ApiResponse = {
            success: !!snapshotPath,
            message: snapshotPath ? 'Heap snapshot generated' : 'Heap snapshot generation failed',
            data: {
                snapshotPath,
                note: snapshotPath ? 'Download the snapshot file for analysis' : 'Install heapdump module for snapshot generation'
            },
            timestamp: new Date().toISOString()
        };

        res.status(snapshotPath ? 200 : 503).json(response);
    });
}

export default HealthController;
