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

    // private getEnvVarAsBoolean(key: string, defaultValue?: boolean): boolean {
    //     const value = process.env[key];
    //     if (value === undefined) {
    //         if (defaultValue !== undefined) {
    //             return defaultValue;
    //         }
    //         throw new Error(`Environment variable ${key} is required but not set`);
    //     }
    //     return value.toLowerCase() === 'true';
    // }

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
