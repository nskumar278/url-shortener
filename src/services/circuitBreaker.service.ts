import logger from '@configs/logger';
import MetricsService from '@services/metrics.service';

/**
 * Circuit Breaker States
 */
export enum CircuitState {
    CLOSED = 'CLOSED',     // Normal operation
    OPEN = 'OPEN',         // Circuit is open, failing fast
    HALF_OPEN = 'HALF_OPEN' // Testing if service is back
}

/**
 * Circuit Breaker Configuration
 */
export interface CircuitBreakerConfig {
    failureThreshold: number;      // Number of failures before opening
    successThreshold: number;      // Number of successes to close from half-open
    timeout: number;               // Time to wait before moving to half-open (ms)
    resetTimeout: number;          // Time between reset attempts (ms)
    monitoringWindow: number;      // Time window for failure tracking (ms)
    healthCheckInterval?: number;  // Health check interval when open (ms)
}

/**
 * Default circuit breaker configurations for different services
 */
export const DEFAULT_CONFIGS = {
    database: {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 30000,        // 30 seconds
        resetTimeout: 60000,   // 1 minute
        monitoringWindow: 60000, // 1 minute
        healthCheckInterval: 10000 // 10 seconds
    },
    cache: {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 15000,        // 15 seconds
        resetTimeout: 30000,   // 30 seconds
        monitoringWindow: 30000, // 30 seconds
        healthCheckInterval: 5000  // 5 seconds
    },
    external: {
        failureThreshold: 3,
        successThreshold: 1,
        timeout: 20000,        // 20 seconds
        resetTimeout: 60000,   // 1 minute
        monitoringWindow: 60000, // 1 minute
        healthCheckInterval: 15000 // 15 seconds
    }
};

/**
 * Circuit Breaker Implementation
 */
export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount = 0;
    private successCount = 0;
    private lastFailureTime = 0;
    private nextAttemptTime = 0;
    private failures: number[] = []; // Sliding window of failure timestamps
    private healthCheckTimer?: NodeJS.Timeout | null = null;

    constructor(
        private name: string,
        private config: CircuitBreakerConfig,
        private healthCheck?: () => Promise<boolean>
    ) {
        logger.info(`Circuit breaker '${name}' initialized`, {
            config: this.config,
            state: this.state
        });
    }

    /**
     * Execute a function with circuit breaker protection
     */
    async execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
        // Check if circuit should be opened
        this.checkState();

        if (this.state === CircuitState.OPEN) {
            logger.warn(`Circuit breaker '${this.name}' is OPEN - failing fast`);
            this.recordMetrics();
            
            if (fallback) {
                logger.info(`Executing fallback for '${this.name}'`);
                return await fallback();
            }
            
            throw new CircuitBreakerOpenError(`Circuit breaker '${this.name}' is open`);
        }

        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure(error);
            throw error;
        }
    }

    /**
     * Handle successful operation
     */
    private onSuccess(): void {
        this.successCount++;
        
        if (this.state === CircuitState.HALF_OPEN) {
            if (this.successCount >= this.config.successThreshold) {
                this.closeCircuit();
            }
        } else if (this.state === CircuitState.CLOSED) {
            // Reset failure count on success in closed state
            this.failureCount = 0;
            this.failures = [];
        }

        this.recordMetrics();
        logger.debug(`Circuit breaker '${this.name}' - Success recorded`, {
            state: this.state,
            successCount: this.successCount,
            failureCount: this.failureCount
        });
    }

    /**
     * Handle failed operation
     */
    private onFailure(error: any): void {
        const now = Date.now();
        this.failureCount++;
        this.lastFailureTime = now;
        this.failures.push(now);
        
        // Clean old failures outside monitoring window
        this.cleanOldFailures();

        logger.warn(`Circuit breaker '${this.name}' - Failure recorded`, {
            error: error?.message || 'Unknown error',
            state: this.state,
            failureCount: this.failureCount,
            recentFailures: this.failures.length
        });

        // Check if we should open the circuit
        if (this.state === CircuitState.CLOSED && this.shouldOpenCircuit()) {
            this.openCircuit();
        } else if (this.state === CircuitState.HALF_OPEN) {
            // Any failure in half-open state reopens the circuit
            this.openCircuit();
        }

        this.recordMetrics();
    }

    /**
     * Check if circuit should be opened based on failure threshold
     */
    private shouldOpenCircuit(): boolean {
        return this.failures.length >= this.config.failureThreshold;
    }

    /**
     * Clean failures outside the monitoring window
     */
    private cleanOldFailures(): void {
        const cutoff = Date.now() - this.config.monitoringWindow;
        this.failures = this.failures.filter(timestamp => timestamp > cutoff);
    }

    /**
     * Open the circuit
     */
    private openCircuit(): void {
        this.state = CircuitState.OPEN;
        this.successCount = 0;
        this.nextAttemptTime = Date.now() + this.config.timeout;
        
        logger.error(`Circuit breaker '${this.name}' OPENED`, {
            failureCount: this.failureCount,
            recentFailures: this.failures.length,
            nextAttemptTime: new Date(this.nextAttemptTime).toISOString()
        });

        // Start health checking if available
        this.startHealthChecking();
        this.recordMetrics();
    }

    /**
     * Move to half-open state
     */
    private halfOpenCircuit(): void {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
        
        logger.info(`Circuit breaker '${this.name}' moved to HALF_OPEN - testing service`);
        this.stopHealthChecking();
        this.recordMetrics();
    }

    /**
     * Close the circuit
     */
    private closeCircuit(): void {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.failures = [];
        
        logger.info(`Circuit breaker '${this.name}' CLOSED - service recovered`);
        this.stopHealthChecking();
        this.recordMetrics();
    }

    /**
     * Check and update circuit state
     */
    private checkState(): void {
        if (this.state === CircuitState.OPEN) {
            const now = Date.now();
            if (now >= this.nextAttemptTime) {
                this.halfOpenCircuit();
            }
        }
    }

    /**
     * Start health checking when circuit is open
     */
    private startHealthChecking(): void {
        if (!this.healthCheck || !this.config.healthCheckInterval) {
            return;
        }

        this.stopHealthChecking(); // Ensure no duplicate timers

        this.healthCheckTimer = setInterval(async () => {
            try {
                logger.debug(`Health checking '${this.name}'`);
                const isHealthy = await this.healthCheck!();
                
                if (isHealthy) {
                    logger.info(`Health check passed for '${this.name}' - moving to HALF_OPEN`);
                    this.halfOpenCircuit();
                }
            } catch (error) {
                logger.debug(`Health check failed for '${this.name}'`, { 
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }, this.config.healthCheckInterval);
    }

    /**
     * Stop health checking
     */
    private stopHealthChecking(): void {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
    }

    /**
     * Record metrics for monitoring
     */
    private recordMetrics(): void {
        MetricsService.recordCircuitBreakerState(this.name, this.state);
        MetricsService.recordCircuitBreakerFailures(this.name, this.failureCount);
        
        if (this.state === CircuitState.OPEN) {
            MetricsService.recordCircuitBreakerOpenEvents(this.name);
        }
    }

    /**
     * Get current circuit breaker state
     */
    getState(): CircuitState {
        return this.state;
    }

    /**
     * Get circuit breaker statistics
     */
    getStats() {
        return {
            name: this.name,
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            recentFailures: this.failures.length,
            lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
            nextAttemptTime: this.nextAttemptTime ? new Date(this.nextAttemptTime).toISOString() : null
        };
    }

    /**
     * Manually reset circuit breaker (for testing/admin purposes)
     */
    reset(): void {
        this.closeCircuit();
        logger.info(`Circuit breaker '${this.name}' manually reset`);
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        this.stopHealthChecking();
        logger.info(`Circuit breaker '${this.name}' destroyed`);
    }
}

/**
 * Circuit Breaker Open Error
 */
export class CircuitBreakerOpenError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CircuitBreakerOpenError';
    }
}

/**
 * Circuit Breaker Manager - Singleton to manage all circuit breakers
 */
class CircuitBreakerManager {
    private static instance: CircuitBreakerManager;
    private breakers = new Map<string, CircuitBreaker>();

    private constructor() {}

    static getInstance(): CircuitBreakerManager {
        if (!CircuitBreakerManager.instance) {
            CircuitBreakerManager.instance = new CircuitBreakerManager();
        }
        return CircuitBreakerManager.instance;
    }

    /**
     * Get or create a circuit breaker
     */
    getCircuitBreaker(
        name: string, 
        config?: CircuitBreakerConfig, 
        healthCheck?: () => Promise<boolean>
    ): CircuitBreaker {
        if (!this.breakers.has(name)) {
            const breakerConfig = config || DEFAULT_CONFIGS.external;
            const breaker = new CircuitBreaker(name, breakerConfig, healthCheck);
            this.breakers.set(name, breaker);
        }
        return this.breakers.get(name)!;
    }

    /**
     * Get all circuit breaker statistics
     */
    getAllStats() {
        const stats: any[] = [];
        this.breakers.forEach(breaker => {
            stats.push(breaker.getStats());
        });
        return stats;
    }

    /**
     * Reset all circuit breakers
     */
    resetAll(): void {
        this.breakers.forEach(breaker => breaker.reset());
        logger.info('All circuit breakers reset');
    }

    /**
     * Cleanup all circuit breakers
     */
    destroy(): void {
        this.breakers.forEach(breaker => breaker.destroy());
        this.breakers.clear();
        logger.info('Circuit breaker manager destroyed');
    }
}

export default CircuitBreakerManager.getInstance();
