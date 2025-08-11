import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';
import logger from '@configs/logger';
import env from '@configs/env';

const register = new client.Registry();

client.collectDefaultMetrics({
    register,
    prefix: 'url_shortener_',
});

// HTTP Request Metrics
const httpRequestTotal = new client.Counter({
    name: 'url_shortener_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
});

const httpRequestDuration = new client.Histogram({
    name: 'url_shortener_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
    registers: [register]
});

// Cache Metrics
const cacheOperations = new client.Counter({
    name: 'url_shortener_cache_operations_total',
    help: 'Total number of cache operations',
    labelNames: ['operation', 'result'], // operation: get/set/delete, result: hit/miss/success/error
    registers: [register]
});

const cacheHitRatio = new client.Gauge({
    name: 'url_shortener_cache_hit_ratio',
    help: 'Cache hit ratio (percentage)',
    registers: [register]
});

const cacheOperationDuration = new client.Histogram({
    name: 'url_shortener_cache_operation_duration_seconds',
    help: 'Duration of cache operations in seconds',
    labelNames: ['operation'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    registers: [register]
});

// URL Shortener Business Metrics
const urlsCreated = new client.Counter({
    name: 'url_shortener_urls_created_total',
    help: 'Total number of URLs created',
    registers: [register]
});

const urlRedirects = new client.Counter({
    name: 'url_shortener_redirects_total',
    help: 'Total number of URL redirects',
    labelNames: ['source'], // source: cache/database
    registers: [register]
});

const redirectLatency = new client.Histogram({
    name: 'url_shortener_redirect_duration_seconds',
    help: 'Time taken for URL redirect operations',
    labelNames: ['source'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5],
    registers: [register]
});

// Database Metrics
const databaseOperations = new client.Counter({
    name: 'url_shortener_database_operations_total',
    help: 'Total number of database operations',
    labelNames: ['operation'], // operation: select/insert/update/delete
    registers: [register]
});

const databaseOperationDuration = new client.Histogram({
    name: 'url_shortener_database_operation_duration_seconds',
    help: 'Duration of database operations in seconds',
    labelNames: ['operation'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
    registers: [register]
});

// Active connections
const activeConnections = new client.Gauge({
    name: 'url_shortener_active_connections',
    help: 'Number of active connections',
    labelNames: ['type'], // type: database/cache
    registers: [register]
});

// Connection Pool Metrics
const connectionPoolSize = new client.Gauge({
    name: 'url_shortener_connection_pool_size',
    help: 'Current size of database connection pool',
    labelNames: ['status'], // status: total/idle/used/waiting
    registers: [register]
});

const connectionPoolUtilization = new client.Gauge({
    name: 'url_shortener_connection_pool_utilization_ratio',
    help: 'Database connection pool utilization ratio (0-1)',
    registers: [register]
});

// Click Sync Metrics
const clickSyncOperations = new client.Counter({
    name: 'url_shortener_click_sync_operations_total',
    help: 'Total number of click sync operations',
    labelNames: ['operation', 'status'], // operation: sync/batch_process, status: success/error
    registers: [register]
});

const clickSyncDuration = new client.Histogram({
    name: 'url_shortener_click_sync_duration_seconds',
    help: 'Duration of click sync operations in seconds',
    labelNames: ['operation'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
    registers: [register]
});

const pendingClickCounts = new client.Gauge({
    name: 'url_shortener_pending_click_counts',
    help: 'Number of pending click counts in Redis',
    registers: [register]
});

const clickSyncBatchSize = new client.Histogram({
    name: 'url_shortener_click_sync_batch_size',
    help: 'Number of URLs processed in each sync batch',
    buckets: [1, 5, 10, 25, 50, 100, 200, 500],
    registers: [register]
});

const clickSyncLag = new client.Gauge({
    name: 'url_shortener_click_sync_lag_seconds',
    help: 'Time since last successful click sync',
    registers: [register]
});

class MetricsService {
    private static cacheHits = 0;
    private static cacheMisses = 0;

    // HTTP Request Metrics
    public static recordHttpRequest(method: string, route: string, status: number, duration: number): void {
        httpRequestTotal.inc({ method, route, status_code: status });
        httpRequestDuration.observe({ method, route, status_code: status }, duration);
        logger.debug(`HTTP ${method} ${route} ${status} - ${duration}s`);
    }

    // Cache Metrics
    public static recordCacheHit(operation: string = 'get', duration?: number): void {
        this.cacheHits++;
        cacheOperations.inc({ operation, result: 'hit' });
        if (duration !== undefined) {
            cacheOperationDuration.observe({ operation }, duration);
        }
        this.updateCacheHitRatio();
        logger.debug('Cache hit recorded', { operation, duration });
    }

    public static recordCacheMiss(operation: string = 'get', duration?: number): void {
        this.cacheMisses++;
        cacheOperations.inc({ operation, result: 'miss' });
        if (duration !== undefined) {
            cacheOperationDuration.observe({ operation }, duration);
        }
        this.updateCacheHitRatio();
        logger.debug('Cache miss recorded', { operation, duration });
    }

    public static recordCacheSet(duration?: number): void {
        cacheOperations.inc({ operation: 'set', result: 'success' });
        if (duration !== undefined) {
            cacheOperationDuration.observe({ operation: 'set' }, duration);
        }
        logger.debug('Cache set recorded', { duration });
    }

    public static recordCacheError(operation: string, duration?: number): void {
        cacheOperations.inc({ operation, result: 'error' });
        if (duration !== undefined) {
            cacheOperationDuration.observe({ operation }, duration);
        }
        logger.debug('Cache error recorded', { operation, duration });
    }

    private static updateCacheHitRatio(): void {
        const total = this.cacheHits + this.cacheMisses;
        if (total > 0) {
            const ratio = (this.cacheHits / total) * 100;
            cacheHitRatio.set(ratio);
        }
    }

    // URL Business Metrics
    public static recordUrlCreated(): void {
        urlsCreated.inc();
        logger.debug('URL creation recorded');
    }

    public static recordRedirect(source: 'cache' | 'database', duration: number): void {
        urlRedirects.inc({ source });
        redirectLatency.observe({ source }, duration);
        logger.debug('Redirect recorded', { source, duration });
    }

    // Database Metrics
    public static recordDatabaseOperation(operation: string, duration: number): void {
        databaseOperations.inc({ operation });
        databaseOperationDuration.observe({ operation }, duration);
        logger.debug('Database operation recorded', { operation, duration });
    }

    // Connection Metrics
    public static setActiveConnections(type: 'database' | 'cache', count: number): void {
        activeConnections.set({ type }, count);
    }

    // Connection Pool Metrics
    public static updateConnectionPoolMetrics(poolStats: {
        total: number;
        idle: number;
        used: number;
        waiting: number;
        max: number;
    }): void {
        // Record individual pool metrics
        connectionPoolSize.set({ status: 'total' }, poolStats.total);
        connectionPoolSize.set({ status: 'idle' }, poolStats.idle);
        connectionPoolSize.set({ status: 'used' }, poolStats.used);
        connectionPoolSize.set({ status: 'waiting' }, poolStats.waiting);
        
        // Calculate and record utilization ratio
        const utilization = poolStats.max > 0 ? poolStats.used / poolStats.max : 0;
        connectionPoolUtilization.set(utilization);
        
        logger.debug('Connection pool metrics updated', poolStats);
    }

    // Click Sync Metrics
    public static recordClickSyncOperation(operation: 'sync' | 'batch_process', status: 'success' | 'error', duration?: number): void {
        clickSyncOperations.inc({ operation, status });
        if (duration !== undefined) {
            clickSyncDuration.observe({ operation }, duration);
        }
        logger.debug('Click sync operation recorded', { operation, status, duration });
    }

    public static setPendingClickCounts(count: number): void {
        pendingClickCounts.set(count);
    }

    public static recordClickSyncBatchSize(size: number): void {
        clickSyncBatchSize.observe(size);
    }

    public static updateClickSyncLag(): void {
        clickSyncLag.setToCurrentTime();
    }

    // Get current cache hit ratio
    public static getCacheHitRatio(): number {
        const total = this.cacheHits + this.cacheMisses;
        return total > 0 ? (this.cacheHits / total) * 100 : 0;
    }

    // Get metrics for Prometheus scraping
    public static async getMetrics(): Promise<string> {
        return register.metrics();
    }

    // Reset cache counters (useful for testing)
    public static resetCacheCounters(): void {
        this.cacheHits = 0;
        this.cacheMisses = 0;
        cacheHitRatio.set(0);
    }
}

// Middleware to track HTTP requests
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    if (!env.METRICS_ENABLED) {
        next();
        return;
    }

    const start = Date.now();

    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000; // Convert to seconds
        const route = req.route?.path || req.path;

        try {
            MetricsService.recordHttpRequest(
                req.method,
                route,
                res.statusCode,
                duration
            );
        } catch (error) {
            logger.error('Error recording HTTP metrics', { error, method: req.method, route });
        }

    });

    next();
}

// Middleware to serve metrics endpoint
export const metricsEndpoint = async (_req: Request, res: Response): Promise<void> => {
    try {
        if (!env.METRICS_ENABLED) {
            res.status(404).send('Metrics are disabled');
            return;
        }

        res.setHeader('Content-Type', register.contentType);
        const metrics = await MetricsService.getMetrics();
        res.end(metrics);
    } catch (error) {
        logger.error('Error serving metrics', { error });
        res.status(500).send('Internal Server Error');
    }
}

export default MetricsService;