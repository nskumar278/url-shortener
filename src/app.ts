import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import logger from '@configs/logger';
import env from '@configs/env';

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

app.use((_req, res, _next) => {
  res.status(404).json({
    message: 'Not Found',
    timestamp: new Date().toISOString(),
  });
});

app.use((err: any, _req: any, res: any, _next: any) => {
  logger.error('Unhandled error:', err);
  
  // Don't leak error details in production
  const message = env.isProduction() ? 'Internal Server Error' : err.message;
  const stack = env.isProduction() ? undefined : err.stack;
  
  res.status(err.status || 500).json({
    message,
    timestamp: new Date().toISOString(),
    ...(stack && { stack }),
  });
});

export default app;