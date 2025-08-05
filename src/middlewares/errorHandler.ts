import { Request, Response, NextFunction } from 'express';
import logger from '@configs/logger';
import env from '@configs/env';
import { ApiResponse } from '@interfaces/api.interface';


export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction): void => {
  logger.error('Unhandled error:', err);

  const message = env.isProduction() ? 'Internal Server Error' : err.message;
  const stack = env.isProduction() ? undefined : err.stack;

  const response: ApiResponse = {
    success: false,
    message,
    error: stack,
    timestamp: new Date().toISOString(),
  };

  res.status(err.status || 500).json(response);
}

export const notFoundHandler = (_req: Request, res: Response, _next: NextFunction) => {
  const response: ApiResponse = {
    success: false,
    message: 'Not Found',
    timestamp: new Date().toISOString(),
  };

  res.status(404).json(response);
}

export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}