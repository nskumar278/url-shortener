export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  uptime?: number;
  timestamp: string;
}

export interface ApiVersionInfo {
  version: string;
  deprecated?: boolean;
  deprecatedSince?: string;
  sunsetDate?: string;
  replacement?: string;
}