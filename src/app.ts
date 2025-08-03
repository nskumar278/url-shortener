import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import logger from '@configs/logger';
import env from '@configs/env';
import { errorHandler, notFoundHandler } from '@middlewares/errorHandler';
import indexRouter from '@routes/index.route';
import v1IndexRouter from '@routes/v1/index.route';

const app = express();

app.use(cors({
  origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json({ limit: env.REQUEST_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: env.REQUEST_LIMIT }));

app.use(morgan(env.isProduction() ? 'combined' : 'dev', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// API Routes
app.use('/', indexRouter);
app.use('/api/v1', v1IndexRouter);

// 404 Not Found handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

export default app;