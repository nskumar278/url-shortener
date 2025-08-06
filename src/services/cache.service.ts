import Redis from 'ioredis';
import env from '@configs/env';
import logger from '@configs/logger';

interface CacheOptions {
    ttl?: number | undefined;
    prefix?: string;
}

class CacheService {
    private static instance: CacheService;
    private redisClient: Redis;
    private isConnected: boolean = false;

    private constructor() {
        this.redisClient = new Redis({
            host: env.REDIS_HOST,
            port: Number(env.REDIS_PORT),
            password: env.REDIS_PASSWORD,
            db: env.REDIS_DB || 0
        });

        this.setupEventListeners();
    }

    public static getInstance(): CacheService {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }

    private setupEventListeners(): void {
        this.redisClient.on('connect', () => {
            logger.info('Redis connection established');
            this.isConnected = true;
        });

        this.redisClient.on('ready', () => {
            logger.info('Redis ready to receive commands');
        });

        this.redisClient.on('error', (error: Error) => {
            logger.error('Redis connection error:', error);
            this.isConnected = false;
        });

        this.redisClient.on('close', () => {
            logger.warn('Redis connection closed');
            this.isConnected = false;
        });

        this.redisClient.on('reconnecting', () => {
            logger.info('Redis reconnecting...');
        });
    }

    public async connect(): Promise<void> {
        try {
            if (!this.isConnected) {
                await this.redisClient.connect();
                this.isConnected = true;
                logger.info('Redis client connected successfully');
            }
        } catch (error) {
            logger.error('Error connecting to Redis:', error);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        try {
            if (this.isConnected) {
                await this.redisClient.disconnect();
                this.isConnected = false;
                logger.info('Redis client disconnected successfully');
            }
        } catch (error) {
            logger.error('Error disconnecting from Redis:', error);
            throw error;
        }
    }

    public async get(key: string): Promise<string | null> {
        try {
            if (!this.isConnected) {
                logger.warn('Redis not connected, cache miss for key:', key);
                return null;
            }
            const result = await this.redisClient.get(key);
            logger.info('Cache hit for short ID', { shortId: key, originalUrl: result });
            return result;
        } catch (error) {
            logger.error('Error getting key from Redis:', error);
            return null;
        }
    }

    public async set(key: string, value: string, options: CacheOptions = {}): Promise<void> {
        try {
            if (!this.isConnected) {
                logger.warn('Redis not connected, cannot set key:', key);
                return;
            }
            
            const ttl = options.ttl || env.CACHE_TTL;
            await this.redisClient.setex(key, ttl, value);
            logger.info('Cache set operation', { key, value, ttl });
            return;
        } catch (error) {
            logger.error('Error setting key in Redis:', error);
            return;
        }
    }

    public async delete(key: string): Promise<boolean> {
        try {
            if (!this.isConnected) {
                logger.warn('Redis not connected, cannot delete key:', key);
                return false;
            }
            await this.redisClient.del(key);
            logger.info('Cache delete operation', { key });
            return true;
        } catch (error) {
            logger.error('Error deleting key from Redis:', error);
            return false;
        }
    }

    public async exists(key: string): Promise<boolean> {
        try {
            if (!this.isConnected) {
                logger.warn('Redis not connected, cannot check existence of key:', key);
                return false;
            }
            const result = await this.redisClient.exists(key);
            logger.info('Cache exists operation', { key, exists: result });
            return result === 1;
        } catch (error) {
            logger.error('Error checking key existence in Redis:', error);
            return false;
        }
    }

    public async increment(key: string, amount: number = 1): Promise<number> {
        try {
            if (!this.isConnected) {
                logger.warn('Redis not connected, cannot increment key:', key);
                return 0;
            }
            const result = await this.redisClient.incrby(key, amount);
            logger.info('Cache increment operation', { key, amount, result });
            return result;
        } catch (error) {
            logger.error('Error incrementing key in Redis:', error);
            return 0;
        }
    }

    public async expire(key: string, seconds: number): Promise<boolean> {
        try {
            if (!this.isConnected) {
                logger.warn('Redis not connected, cannot set expiration for key:', key);
                return false;
            }
            const result = await this.redisClient.expire(key, seconds);
            logger.info('Cache expire operation', { key, seconds, result });
            return result === 1;
        } catch (error) {
            logger.error('Error setting expiration for key in Redis:', error);
            return false;
        }
    }

    public async flushCache(): Promise<void> {
        try {
            if (!this.isConnected) {
                logger.warn('Redis not connected, cannot flush all keys');
                return;
            }
            await this.redisClient.flushdb();
            logger.info('All keys flushed from Redis cache');
        } catch (error) {
            logger.error('Error flushing all keys in Redis:', error);
            return;
        }
    }

    public async healthCheck(): Promise<boolean> {
        try {
            if (!this.isConnected) {
                logger.warn('Redis not connected, health check failed');
                return false;
            }
            const result = await this.redisClient.ping();
            logger.info('Redis health check successful', { result });
            return result === 'PONG';
        } catch (error) {
            logger.error('Error performing Redis health check:', error);
            return false;
        }
    }

    // URL Specific Methods
    public async cacheShortUrl(shortUrlId: string, originalUrl: string, ttl?: number): Promise<void> {
        const cacheKey = `shortUrl:${shortUrlId}`;
        await this.set(cacheKey, originalUrl, { ttl });
    }

    public async getShortUrl(shortUrlId: string): Promise<string | null> {
        const cacheKey = `shortUrl:${shortUrlId}`;
        return this.get(cacheKey);
    }

    public async deleteCachedShortUrl(shortUrlId: string): Promise<boolean> {
        const cacheKey = `shortUrl:${shortUrlId}`;
        return this.delete(cacheKey);
    }

    public async incrementUrlClicks(shortUrlId: string): Promise<number> {
        const cacheKey = `clicks:${shortUrlId}`;
        return this.increment(cacheKey);
    }
}

export default CacheService.getInstance();