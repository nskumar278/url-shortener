import { createServer } from 'http';
import app from './app';
import { ServerConfig } from '@interfaces/server.interface';
import env from '@configs/env';
import logger from '@configs/logger';

const server = createServer(app);

const config: ServerConfig = {
    port: env.PORT,
    host: env.HOST,
    nodeEnv: env.NODE_ENV,
};

// Graceful shutdown handling
const gracefulShutdown = (signal: string) => {
    logger.warn(`Received ${signal}. Starting graceful shutdown...`);

    server.close((err?: Error) => {
        if (err) {
            logger.error('Error during server shutdown:', err);
            process.exit(1);
        }

        logger.info('Server closed successfully');
        process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
        logger.error('Force shutdown after timeout');
        process.exit(1);
    }, 30000);
};

// Error handler
const handleServerError = (error: NodeJS.ErrnoException): void => {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof config.port === 'string'
        ? `Pipe ${config.port}`
        : `Port ${config.port}`;

    switch (error.code) {
        case 'EACCES':
            logger.error(`${bind} requires elevated privileges`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            logger.error(`${bind} is already in use`);
            process.exit(1);
            break;
        default:
            throw error;
    }
};

// Graceful shutdown on process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error): void => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown): void => {
    logger.error('Unhandled Rejection:', reason);
    gracefulShutdown('unhandledRejection');
});

// Server event handlers
server.on('error', handleServerError);

server.on('listening', (): void => {
    logger.info(`🚀 Server is running at http://${config.host}:${config.port}`);
    logger.info(`📦 Environment: ${config.nodeEnv}`);
    logger.info(`📝 Log Level: ${env.getLogLevel()}`);
});

server.listen(config.port, config.host);
