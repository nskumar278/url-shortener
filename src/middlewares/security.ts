import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import { Request, Response } from 'express';
import env  from '@configs/env';

// Security headers middleware for REST API endpoints
export const apiSecurityMiddleware = helmet({
  // Disable CSP for API endpoints since they only serve JSON
  contentSecurityPolicy: false,
  // Keep HSTS for HTTPS security
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  // Prevent MIME type sniffing
  noSniff: true,
  // Prevent clickjacking (though less relevant for APIs)
  frameguard: { action: 'deny' },
  // Hide X-Powered-By header
  hidePoweredBy: true,
});

// Security headers middleware for documentation/UI endpoints (like Swagger)
export const docsSecurityMiddleware = helmet({
  // Enable CSP for docs pages that serve HTML/CSS/JS
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Swagger UI needs inline styles
      scriptSrc: ["'self'", "'unsafe-inline'"], // Swagger UI needs inline scripts
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:"],
      connectSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  frameguard: { action: 'sameorigin' }, // Allow same-origin framing for docs
  hidePoweredBy: true,
});

// General security middleware (use this by default)
export const securityMiddleware = apiSecurityMiddleware;

// Compression middleware
export const compressionMiddleware = compression({
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024,
});

// CORS middleware
export const corsMiddleware = cors({
  origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});