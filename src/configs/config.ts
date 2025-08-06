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
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  test: {
    username: env.DB_USERNAME || 'root',
    password: env.DB_PASSWORD || undefined,
    database: env.DB_NAME || 'url_shortener_test',
    host: env.DB_HOST || '127.0.0.1',
    dialect: (env.DB_DIALECT || 'mysql') as Dialect,
    logging: true
  },
  production: {
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD || undefined,
    database: env.DB_NAME,
    host: env.DB_HOST,
    dialect: (env.DB_DIALECT || 'mysql') as Dialect,
    logging: true,
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
};

export default config;