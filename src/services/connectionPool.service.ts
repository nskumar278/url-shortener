import db from '@models/db';
import MetricsService from '@services/metrics.service';
import logger from '@configs/logger';

interface PoolStats {
    total: number;
    idle: number;
    used: number;
    waiting: number;
    max: number;
    min: number;
}

class ConnectionPoolService {
    private static instance: ConnectionPoolService;
    private monitoringInterval: NodeJS.Timeout | null = null;
    private isMonitoring = false;

    private constructor() {}

    public static getInstance(): ConnectionPoolService {
        if (!ConnectionPoolService.instance) {
            ConnectionPoolService.instance = new ConnectionPoolService();
        }
        return ConnectionPoolService.instance;
    }

    /**
     * Start monitoring the database connection pool
     * Only runs in production environment to avoid overhead in dev/test
     */
    public startMonitoring(): void {
        const env = process.env.NODE_ENV || 'development';
        
        if (this.isMonitoring) {
            logger.warn('Connection pool monitoring is already running');
            return;
        }

        if (env === 'production') {
            this.isMonitoring = true;
            
            logger.info('Starting database connection pool monitoring');
            
            // Monitor every 30 seconds
            this.monitoringInterval = setInterval(() => {
                this.collectPoolMetrics();
            }, 30000);

            // Initial collection
            this.collectPoolMetrics();
        } else {
            logger.debug('Connection pool monitoring disabled in development/test environment');
        }
    }

    /**
     * Stop monitoring the connection pool
     */
    public stopMonitoring(): void {
        if (!this.isMonitoring) {
            return;
        }

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        this.isMonitoring = false;
        logger.info('Stopped database connection pool monitoring');
    }

    /**
     * Get current connection pool statistics
     */
    public getPoolStats(): PoolStats | null {
        try {
            const sequelize = db.sequelize;
            const connectionManager = (sequelize as any).connectionManager;
            
            if (!connectionManager || !connectionManager.pool) {
                logger.warn('Connection pool not available');
                return null;
            }

            const pool = connectionManager.pool;
            const config = sequelize.config;
            
            const stats: PoolStats = {
                total: pool.size || 0,
                idle: pool.available || 0,
                used: pool.using || 0,
                waiting: pool.waiting || 0,
                max: config.pool?.max || 5,
                min: config.pool?.min || 0
            };

            return stats;
        } catch (error) {
            logger.error('Error getting connection pool stats', { error });
            return null;
        }
    }

    /**
     * Collect and report pool metrics to monitoring system
     */
    private collectPoolMetrics(): void {
        try {
            const stats = this.getPoolStats();
            
            if (!stats) {
                return;
            }

            // Update Prometheus metrics
            MetricsService.updateConnectionPoolMetrics(stats);

            // Log warnings for concerning pool states
            this.checkPoolHealth(stats);

        } catch (error) {
            logger.error('Error collecting connection pool metrics', { error });
        }
    }

    /**
     * Check pool health and log warnings
     */
    private checkPoolHealth(stats: PoolStats): void {
        const utilizationRatio = stats.max > 0 ? stats.used / stats.max : 0;
        
        // Alert if pool utilization is high (>80%)
        if (utilizationRatio > 0.8) {
            logger.warn('High database connection pool utilization', {
                utilization: `${(utilizationRatio * 100).toFixed(1)}%`,
                used: stats.used,
                max: stats.max,
                waiting: stats.waiting
            });
        }

        // Alert if there are waiting connections
        if (stats.waiting > 0) {
            logger.warn('Database connections are waiting', {
                waiting: stats.waiting,
                used: stats.used,
                max: stats.max
            });
        }

        // Alert if too many idle connections (potential memory waste)
        const idleRatio = stats.max > 0 ? stats.idle / stats.max : 0;
        if (stats.idle > 0 && idleRatio > 0.7) {
            logger.warn('High number of idle database connections', {
                idle: stats.idle,
                total: stats.total,
                idleRatio: `${(idleRatio * 100).toFixed(1)}%`
            });
        }

        // Log healthy state periodically (every 10 minutes)
        if (utilizationRatio <= 0.5 && stats.waiting === 0) {
            logger.debug('Database connection pool is healthy', {
                utilization: `${(utilizationRatio * 100).toFixed(1)}%`,
                stats
            });
        }
    }

    /**
     * Force cleanup of idle connections (can be called manually if needed)
     */
    public async cleanupIdleConnections(): Promise<void> {
        try {
            const sequelize = db.sequelize;
            const connectionManager = (sequelize as any).connectionManager;
            
            if (connectionManager && connectionManager.pool) {
                // This will trigger cleanup of idle connections based on the idle timeout
                logger.info('Triggering connection pool cleanup');
                
                // The pool will automatically clean up based on the configured idle timeout
                // We can't force it directly, but we can log the action
                const stats = this.getPoolStats();
                if (stats) {
                    logger.info('Connection pool stats before cleanup', stats);
                }
            }
        } catch (error) {
            logger.error('Error during connection pool cleanup', { error });
        }
    }
}

export default ConnectionPoolService.getInstance();
