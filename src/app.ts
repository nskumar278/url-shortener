import express from 'express';
import morgan from 'morgan';
import { errors as celebrateErrors } from 'celebrate';
import logger from '@configs/logger';
import env from '@configs/env';
import { errorHandler, notFoundHandler } from '@middlewares/errorHandler';
import { versioningMiddleware } from '@middlewares/versioning';
import { securityMiddleware, compressionMiddleware, corsMiddleware } from '@middlewares/security';
import { setupSwagger } from '@configs/swagger';
import indexRouter from '@routes/index.route';
import v1IndexRouter from '@routes/v1/index.route';
import urlRouter from '@routes/v1/url.route';

const app = express();

// Security middleware (should be first)
app.use(securityMiddleware);

// Compression middleware
app.use(compressionMiddleware);

// CORS middleware
app.use(corsMiddleware);

// Body parsers
app.use(express.json({ limit: env.REQUEST_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: env.REQUEST_LIMIT }));

// Logging middleware
app.use(morgan(env.isProduction() ? 'combined' : 'dev', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// Versioning middleware
app.use(versioningMiddleware);

// Setup Swagger documentation
setupSwagger(app);

// API Routes
app.use('/', indexRouter);
app.use('/api/v1', v1IndexRouter);

app.use('/api/v1/urls', urlRouter);

// 404 Not Found handler
app.use(notFoundHandler);

// Celebrate error handler
app.use(celebrateErrors());

// Error handling middleware
app.use(errorHandler);

export default app;