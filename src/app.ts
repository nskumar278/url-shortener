import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import logger from '@configs/logger';
import env from '@configs/env';
import { errorHandler, notFoundHandler } from '@middlewares/errorHandler';

const app = express();

app.use(cors({
  origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json({ limit: env.REQUEST_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: env.REQUEST_LIMIT }));

const morganFormat = env.isProduction() ? 'combined' : 'dev';
app.use(morgan(morganFormat, { 
  stream: { write: (message) => logger.info(message.trim()) },
}));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    uptime: process.uptime(),
  });
});

app.get('/', (_req, res) => {
  res.status(200).json({
    message: 'Welcome to the URL Shortener API',
    version: '1.0.0',
    environment: env.NODE_ENV,
  });
});

// 404 Not Found handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

export default app;