import path from 'path';
import fs from 'fs';

// Conditional dotenv loading - only in development/test environments
const NODE_ENV = process.env.NODE_ENV || 'development';
const shouldLoadDotenv = NODE_ENV !== 'production';

if (shouldLoadDotenv) {
    const envPath = path.resolve(process.cwd(), '.env');

    // Only load dotenv if .env file exists and we're not in production
    if (fs.existsSync(envPath)) {
        try {
            // Dynamic import to avoid bundling dotenv in production builds
            const dotenv = require('dotenv');
            dotenv.config({ path: envPath });
            console.log(`📝 Loaded environment variables from ${envPath}`);
        } catch (error) {
            console.warn('⚠️  Warning: dotenv package not found. Install with: npm install --save-dev dotenv');
            console.warn('⚠️  Falling back to system environment variables only.');
        }
    } else {
        console.log('📝 No .env file found, using system environment variables');
    }
} else {
    console.log('🚀 Production mode: Using system environment variables only');
}

// Environment variable validation and type conversion
class EnvironmentConfig {
    public readonly NODE_ENV: string;
    public readonly PORT: number;
    public readonly HOST: string;

    public readonly LOG_LEVEL: string;
    public readonly LOG_DIR: string;

    public readonly CORS_ORIGIN: string;
    public readonly REQUEST_LIMIT: string;
    
    public readonly DB_USERNAME: string;
    public readonly DB_PASSWORD: string;
    public readonly DB_HOST: string;
    public readonly DB_NAME: string;
    public readonly DB_DIALECT: string;

    public readonly REDIS_HOST: string;
    public readonly REDIS_PORT: number;
    public readonly REDIS_PASSWORD: string;
    public readonly REDIS_DB: number;
    public readonly CACHE_TTL: number;

    public readonly METRICS_ENABLED: boolean;
    public readonly METRICS_PORT: number;

    // Click Sync Configuration
    public readonly CLICK_SYNC_INTERVAL_SECONDS: number;
    public readonly CLICK_SYNC_BATCH_SIZE: number;
    public readonly CLICK_SYNC_RETRY_ATTEMPTS: number;
    public readonly CLICK_SYNC_RETRY_DELAY_MS: number;
    public readonly ENABLE_CLICK_SYNC: boolean;

    constructor() {
        // Server Configuration
        this.NODE_ENV = this.getEnvVar('NODE_ENV', 'development');
        this.PORT = this.getEnvVarAsNumber('PORT', 3000);
        this.HOST = this.getEnvVar('HOST', 'localhost');

        // Logging Configuration
        this.LOG_LEVEL = this.getEnvVar('LOG_LEVEL', 'info');
        this.LOG_DIR = this.getEnvVar('LOG_DIR', 'logs');
        
        // Database Configuration
        this.DB_USERNAME = this.getEnvVar('DB_USERNAME');
        this.DB_PASSWORD = this.getEnvVar('DB_PASSWORD');
        this.DB_HOST = this.getEnvVar('DB_HOST');
        this.DB_NAME = this.getEnvVar('DB_NAME');
        this.DB_DIALECT = this.getEnvVar('DB_DIALECT');

        // Redis Configuration
        this.REDIS_HOST = this.getEnvVar('REDIS_HOST');
        this.REDIS_PORT = this.getEnvVarAsNumber('REDIS_PORT');
        this.REDIS_PASSWORD = this.getEnvVar('REDIS_PASSWORD');
        this.REDIS_DB = this.getEnvVarAsNumber('REDIS_DB');
        this.CACHE_TTL = this.getEnvVarAsNumber('CACHE_TTL', 3600);

        // Metrics Configuration
        this.METRICS_ENABLED = this.getEnvVarAsBoolean('METRICS_ENABLED', false);
        this.METRICS_PORT = this.getEnvVarAsNumber('METRICS_PORT');

        // Click Sync Configuration
        this.CLICK_SYNC_INTERVAL_SECONDS = this.getEnvVarAsNumber('CLICK_SYNC_INTERVAL_SECONDS', 30);
        this.CLICK_SYNC_BATCH_SIZE = this.getEnvVarAsNumber('CLICK_SYNC_BATCH_SIZE', 100);
        this.CLICK_SYNC_RETRY_ATTEMPTS = this.getEnvVarAsNumber('CLICK_SYNC_RETRY_ATTEMPTS', 3);
        this.CLICK_SYNC_RETRY_DELAY_MS = this.getEnvVarAsNumber('CLICK_SYNC_RETRY_DELAY_MS', 1000);
        this.ENABLE_CLICK_SYNC = this.getEnvVarAsBoolean('ENABLE_CLICK_SYNC', true);

        // CORS Configuration
        this.CORS_ORIGIN = this.getEnvVar('CORS_ORIGIN', '*');

        // Request Configuration
        this.REQUEST_LIMIT = this.getEnvVar('REQUEST_LIMIT', '10kb');

        // Validate critical environment variables in production
        this.validateProductionConfig();
    }

    private getEnvVar(key: string, defaultValue?: string): string {
        const value = process.env[key];
        if (value === undefined) {
            if (defaultValue !== undefined) {
                return defaultValue;
            }
            throw new Error(`Environment variable ${key} is required but not set`);
        }
        return value;
    }

    private getEnvVarAsNumber(key: string, defaultValue?: number): number {
        const value = process.env[key];
        if (value === undefined) {
            if (defaultValue !== undefined) {
                return defaultValue;
            }
            throw new Error(`Environment variable ${key} is required but not set`);
        }

        const numValue = parseInt(value, 10);
        if (isNaN(numValue)) {
            throw new Error(`Environment variable ${key} must be a valid number`);
        }
        return numValue;
    }

    private getEnvVarAsBoolean(key: string, defaultValue?: boolean): boolean {
        const value = process.env[key];
        if (value === undefined) {
            if (defaultValue !== undefined) {
                return defaultValue;
            }
            throw new Error(`Environment variable ${key} is required but not set`);
        }
        return value.toLowerCase() === 'true';
    }

    private validateProductionConfig(): void {
        if (this.NODE_ENV === 'production') {
            // Add validation for production-critical variables
            if (this.CORS_ORIGIN === '*') {
                console.warn('⚠️  WARNING: CORS_ORIGIN is set to "*" in production. This is not recommended for security.');
            }
        }
    }

    public isProduction(): boolean {
        return this.NODE_ENV === 'production';
    }

    public isDevelopment(): boolean {
        return this.NODE_ENV === 'development';
    }

    public isTest(): boolean {
        return this.NODE_ENV === 'test';
    }

    public getLogLevel(): string {
        return this.LOG_LEVEL;
    }
}

// Export singleton instance
export const env = new EnvironmentConfig();
export default env;
