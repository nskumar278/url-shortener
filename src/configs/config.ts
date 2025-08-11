import env from '@configs/env';
import { Dialect } from 'sequelize';

// Type definition for database configuration
interface DatabaseConfig {
  username: string;
  password: string | undefined;
  database: string;
  host: string;
  dialect: Dialect;
  logging?: boolean;
  pool?: {
    max: number;
    min: number;
    acquire: number;
    idle: number;
  };
}

interface Config {
  development: DatabaseConfig;
  test: DatabaseConfig;
  production: DatabaseConfig;
}

const config: Config = {
  development: {
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD || undefined,
    database: env.DB_NAME,
    host: env.DB_HOST,
    dialect: env.DB_DIALECT as Dialect,
    logging: true,
    pool: {
      max: 3,        // Reduced for development to save memory
      min: 1,        // Keep 1 connection warm
      acquire: 15000, // 15s timeout to acquire connection
      idle: 30000    // 30s before releasing idle connection
    }
  },
  test: {
    username: env.DB_USERNAME || 'root',
    password: env.DB_PASSWORD || undefined,
    database: env.DB_NAME || 'url_shortener_test',
    host: env.DB_HOST || '127.0.0.1',
    dialect: (env.DB_DIALECT || 'mysql') as Dialect,
    logging: false,  // Disable logging in tests for better performance
    pool: {
      max: 2,        // Minimal connections for tests
      min: 0,        // No persistent connections in tests
      acquire: 10000, // 10s timeout
      idle: 20000    // 20s idle timeout
    }
  },
  production: {
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD || undefined,
    database: env.DB_NAME,
    host: env.DB_HOST,
    dialect: (env.DB_DIALECT || 'mysql') as Dialect,
    logging: false,  // Disable SQL logging in production for performance
    pool: {
      max: 5,  
      min: 2,        // Keep 2 warm connections for performance
      acquire: 10000, // 10s timeout (fast fail under high load)
      idle: 60000    // 1 minute idle timeout (aggressive cleanup)
    }
  }
};

export default config;