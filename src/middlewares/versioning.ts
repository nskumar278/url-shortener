import { Request, Response, NextFunction } from 'express';
import logger from '@configs/logger';
import { ApiVersionInfo } from '@interfaces/api.interface';

// Define supported API versions
const SUPPORTED_VERSIONS: Record<string, ApiVersionInfo> = {
  'v1': {
    version: '1.0.0',
    deprecated: false
  }
  // Future versions can be added here
  // 'v2': {
  //   version: '2.0.0',
  //   deprecated: false
  // },
  // 'v1': {
  //   version: '1.0.0',
  //   deprecated: true,
  //   deprecatedSince: '2025-01-01',
  //   sunsetDate: '2025-12-31',
  //   replacement: 'v2'
  // }
};

export const versioningMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const versionFromPath = req.path.match(/^\/api\/(v\d+)/)?.[1];
  
  if (!versionFromPath) {
    // If no version specified in path, continue (handled by api.routes.ts)
    return next();
  }

  const versionInfo = SUPPORTED_VERSIONS[versionFromPath];
  
  if (!versionInfo) {
    res.status(400).json({
      success: false,
      message: `API version '${versionFromPath}' is not supported`,
      supportedVersions: Object.keys(SUPPORTED_VERSIONS),
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Add version info to request for use in controllers
  (req as any).apiVersion = versionInfo;

  // Add version headers
  res.set('API-Version', versionInfo.version);
  res.set('API-Supported-Versions', Object.keys(SUPPORTED_VERSIONS).join(', '));

  // Handle deprecated versions
  if (versionInfo.deprecated) {
    const warningMessage = `API version '${versionFromPath}' is deprecated`;
    
    res.set('Warning', `299 - "${warningMessage}"`);
    res.set('Sunset', versionInfo.sunsetDate || '');
    
    if (versionInfo.replacement) {
      res.set('API-Replacement-Version', versionInfo.replacement);
    }

    logger.warn(`Deprecated API version used: ${versionFromPath} from IP: ${req.ip}`);
  }

  next();
};

export const getApiVersionInfo = (version: string): ApiVersionInfo | null => {
  return SUPPORTED_VERSIONS[version] || null;
};

export const getAllSupportedVersions = (): string[] => {
  return Object.keys(SUPPORTED_VERSIONS);
};
