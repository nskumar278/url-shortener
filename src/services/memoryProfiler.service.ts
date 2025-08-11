import logger from '@configs/logger';
import MetricsService from '@services/metrics.service';
import env from '@configs/env';

/**
 * Memory Profiler Service
 * Provides memory usage monitoring and profiling for 256MB constraint
 */
class MemoryProfilerService {
    private static instance: MemoryProfilerService;
    private monitoringInterval: NodeJS.Timeout | null = null;
    private memoryBaseline: NodeJS.MemoryUsage | null = null;
    private alertThresholds = {
        warning: 200 * 1024 * 1024,  // 200MB warning
        critical: 240 * 1024 * 1024  // 240MB critical
    };

    private constructor() {
        this.captureBaseline();
    }

    static getInstance(): MemoryProfilerService {
        if (!MemoryProfilerService.instance) {
            MemoryProfilerService.instance = new MemoryProfilerService();
        }
        return MemoryProfilerService.instance;
    }

    /**
     * Start continuous memory monitoring
     */
    startMonitoring(intervalMs: number = 30000): void {
        if (this.monitoringInterval) {
            logger.warn('Memory monitoring already running');
            return;
        }

        logger.info('Starting memory monitoring', { intervalMs });

        this.monitoringInterval = setInterval(() => {
            this.collectMemoryMetrics();
        }, intervalMs);

        // Initial collection
        this.collectMemoryMetrics();
    }

    /**
     * Stop memory monitoring
     */
    stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            logger.info('Memory monitoring stopped');
        }
    }

    /**
     * Get current memory usage statistics
     */
    getCurrentMemoryStats() {
        const usage = process.memoryUsage();
        const v8HeapStats = this.getV8HeapStats();
        
        return {
            // Process memory
            rss: usage.rss,                    // Resident Set Size
            heapTotal: usage.heapTotal,        // Total heap allocated
            heapUsed: usage.heapUsed,          // Heap actually used
            external: usage.external,          // External memory
            arrayBuffers: usage.arrayBuffers,  // ArrayBuffer memory
            
            // Formatted for readability
            formatted: {
                rss: this.formatBytes(usage.rss),
                heapTotal: this.formatBytes(usage.heapTotal),
                heapUsed: this.formatBytes(usage.heapUsed),
                external: this.formatBytes(usage.external),
                arrayBuffers: this.formatBytes(usage.arrayBuffers)
            },

            // V8 heap statistics
            v8: v8HeapStats,

            // Usage percentages
            percentages: {
                heapUsage: ((usage.heapUsed / usage.heapTotal) * 100).toFixed(2),
                memoryUsage: ((usage.rss / (256 * 1024 * 1024)) * 100).toFixed(2) // Against 256MB limit
            },

            // Baseline comparison
            baseline: this.memoryBaseline ? {
                rssDiff: usage.rss - this.memoryBaseline.rss,
                heapUsedDiff: usage.heapUsed - this.memoryBaseline.heapUsed
            } : null
        };
    }

    /**
     * Capture memory baseline for comparison
     */
    captureBaseline(): void {
        this.memoryBaseline = process.memoryUsage();
        logger.info('Memory baseline captured', {
            baseline: {
                rss: this.formatBytes(this.memoryBaseline.rss),
                heapUsed: this.formatBytes(this.memoryBaseline.heapUsed)
            }
        });
    }

    /**
     * Force garbage collection if available
     */
    forceGarbageCollection(): boolean {
        if (global.gc) {
            const beforeGC = process.memoryUsage();
            global.gc();
            const afterGC = process.memoryUsage();
            
            logger.info('Forced garbage collection', {
                before: this.formatBytes(beforeGC.heapUsed),
                after: this.formatBytes(afterGC.heapUsed),
                freed: this.formatBytes(beforeGC.heapUsed - afterGC.heapUsed)
            });
            
            return true;
        } else {
            logger.warn('Garbage collection not available - start with --expose-gc flag');
            return false;
        }
    }

    /**
     * Generate heap snapshot (if heapdump available)
     */
    generateHeapSnapshot(): string | null {
        try {
            const heapdump = require('heapdump');
            const filename = `heap-${Date.now()}.heapsnapshot`;
            const filepath = `/tmp/${filename}`;
            
            heapdump.writeSnapshot(filepath, (err: any, filename: string) => {
                if (err) {
                    logger.error('Failed to write heap snapshot', { error: err });
                } else {
                    logger.info('Heap snapshot written', { filename });
                }
            });
            
            return filepath;
        } catch (error) {
            logger.warn('Heapdump module not available - install with: npm install heapdump');
            return null;
        }
    }

    /**
     * Check for memory leaks
     */
    checkForMemoryLeaks(): { hasLeak: boolean; details: any } {
        const current = process.memoryUsage();
        
        if (!this.memoryBaseline) {
            return { hasLeak: false, details: { message: 'No baseline available' } };
        }

        const rssDiff = current.rss - this.memoryBaseline.rss;
        const heapDiff = current.heapUsed - this.memoryBaseline.heapUsed;
        
        // Consider it a potential leak if memory increased by more than 50MB
        const leakThreshold = 50 * 1024 * 1024;
        const hasLeak = rssDiff > leakThreshold || heapDiff > leakThreshold;
        
        return {
            hasLeak,
            details: {
                rssDiff: this.formatBytes(rssDiff),
                heapDiff: this.formatBytes(heapDiff),
                threshold: this.formatBytes(leakThreshold),
                current: {
                    rss: this.formatBytes(current.rss),
                    heapUsed: this.formatBytes(current.heapUsed)
                }
            }
        };
    }

    /**
     * Get memory usage by specific components
     */
    getComponentMemoryUsage() {
        const stats = this.getCurrentMemoryStats();
        
        return {
            timestamp: new Date().toISOString(),
            process: {
                pid: process.pid,
                uptime: process.uptime(),
                version: process.version
            },
            memory: stats,
            environment: {
                nodeEnv: env.NODE_ENV,
                memoryLimit: '256MB',
                usage: stats.percentages.memoryUsage + '%'
            }
        };
    }

    /**
     * Collect and record memory metrics
     */
    private collectMemoryMetrics(): void {
        const stats = this.getCurrentMemoryStats();
        
        // Record metrics for Prometheus
        MetricsService.recordMemoryUsage(
            stats.rss,
            stats.heapUsed,
            stats.heapTotal,
            stats.external
        );

        // Check for memory alerts
        this.checkMemoryAlerts(stats);
        
        // Log detailed memory stats
        logger.info('Memory usage collected', {
            memory: stats.formatted,
            percentages: stats.percentages,
            v8: stats.v8?.formatted || 'unavailable'
        });
    }

    /**
     * Check memory usage against alert thresholds
     */
    private checkMemoryAlerts(stats: any): void {
        const { rss } = stats;
        
        if (rss >= this.alertThresholds.critical) {
            logger.error('CRITICAL: Memory usage exceeds threshold', {
                current: this.formatBytes(rss),
                threshold: this.formatBytes(this.alertThresholds.critical),
                percentage: stats.percentages.memoryUsage + '%'
            });
            
            // Force GC on critical memory usage
            this.forceGarbageCollection();
            
        } else if (rss >= this.alertThresholds.warning) {
            logger.warn('WARNING: High memory usage detected', {
                current: this.formatBytes(rss),
                threshold: this.formatBytes(this.alertThresholds.warning),
                percentage: stats.percentages.memoryUsage + '%'
            });
        }
    }

    /**
     * Get V8 heap statistics
     */
    private getV8HeapStats() {
        try {
            const v8 = require('v8');
            const heapStats = v8.getHeapStatistics();
            
            return {
                raw: heapStats,
                formatted: {
                    totalHeapSize: this.formatBytes(heapStats.total_heap_size),
                    totalHeapSizeExecutable: this.formatBytes(heapStats.total_heap_size_executable),
                    totalPhysicalSize: this.formatBytes(heapStats.total_physical_size),
                    totalAvailableSize: this.formatBytes(heapStats.total_available_size),
                    usedHeapSize: this.formatBytes(heapStats.used_heap_size),
                    heapSizeLimit: this.formatBytes(heapStats.heap_size_limit)
                }
            };
        } catch (error) {
            logger.warn('V8 heap statistics not available', { 
                error: error instanceof Error ? error.message : 'Unknown error' 
            });
            return null;
        }
    }

    /**
     * Format bytes to human readable format
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get memory profiling summary
     */
    getProfilingSummary() {
        const stats = this.getCurrentMemoryStats();
        const leakCheck = this.checkForMemoryLeaks();
        
        return {
            status: stats.rss < this.alertThresholds.warning ? 'healthy' : 
                   stats.rss < this.alertThresholds.critical ? 'warning' : 'critical',
            usage: stats.formatted,
            percentages: stats.percentages,
            memoryLeak: leakCheck,
            recommendations: this.generateRecommendations(stats)
        };
    }

    /**
     * Generate memory optimization recommendations
     */
    private generateRecommendations(stats: any): string[] {
        const recommendations: string[] = [];
        const memoryPercentage = parseFloat(stats.percentages.memoryUsage);
        
        if (memoryPercentage > 90) {
            recommendations.push('URGENT: Memory usage above 90% - consider scaling horizontally');
            recommendations.push('Force garbage collection immediately');
            recommendations.push('Review recent deployments for memory leaks');
        } else if (memoryPercentage > 75) {
            recommendations.push('High memory usage - monitor closely');
            recommendations.push('Consider running garbage collection');
            recommendations.push('Review cache sizes and TTL settings');
        } else if (memoryPercentage > 50) {
            recommendations.push('Memory usage is moderate - continue monitoring');
            recommendations.push('Consider optimizing object allocations');
        } else {
            recommendations.push('Memory usage is healthy');
        }

        if (stats.v8 && parseFloat(stats.percentages.heapUsage) > 80) {
            recommendations.push('High heap usage detected - check for object leaks');
        }

        return recommendations;
    }
}

export default MemoryProfilerService;
