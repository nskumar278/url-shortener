import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';
import logger from '@configs/logger';
import env from '@configs/env';

const register = new client.Registry();

client.collectDefaultMetrics({
    register,
    prefix: 'url_shortener_',
});

// Custom metrics
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
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [register]
});

class MetricsService {
    // Record an HTTP request
    public static recordHttpRequest(method: string, route: string, status: number, duration: number): void {
        httpRequestTotal.inc({ method, route, status_code: status });
        httpRequestDuration.observe({ method, route, status_code: status }, duration);
        logger.info(`HTTP ${method} ${route} ${status} - ${duration}s`);
    }

    // Get metrics for Prometheus scraping
    public static async getMetrics(): Promise<string> {
        return register.metrics();
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