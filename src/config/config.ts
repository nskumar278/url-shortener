import env from '@configs/env';

export = {
  development: {
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    host: env.DB_HOST,
    dialect: env.DB_DIALECT,
  },
  test: {
    username: env.DB_USERNAME || 'root',
    password: env.DB_PASSWORD || null,
    database: env.DB_NAME || 'my_database_test',
    host: env.DB_HOST || '127.0.0.1',
    dialect: env.DB_DIALECT || 'mysql'
  },
  production: {
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    host: env.DB_HOST,
    dialect: env.DB_DIALECT,
  }
};