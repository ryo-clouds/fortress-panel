import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { Logger } from '@fortress-panel/shared';

class RedisConnection {
  private static instance: RedisConnection;
  private client: RedisClientType;
  private logger = Logger.getInstance();

  private constructor() {
    this.client = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password,
      database: config.redis.db,
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis client error', { error: error.message });
    });

    this.client.on('connect', () => {
      this.logger.info('✅ Redis client connected');
    });

    this.client.on('ready', () => {
      this.logger.info('✅ Redis client ready');
    });

    this.client.on('end', () => {
      this.logger.info('❌ Redis client disconnected');
    });
  }

  public static getInstance(): RedisConnection {
    if (!RedisConnection.instance) {
      RedisConnection.instance = new RedisConnection();
    }
    return RedisConnection.instance;
  }

  public static async initialize(): Promise<void> {
    const instance = RedisConnection.getInstance();
    try {
      await instance.client.connect();
    } catch (error) {
      instance.logger.error('❌ Redis connection failed', { error: error.message });
      throw error;
    }
  }

  public static async close(): Promise<void> {
    const instance = RedisConnection.getInstance();
    try {
      await instance.client.quit();
      instance.logger.info('✅ Redis connection closed');
    } catch (error) {
      instance.logger.error('❌ Error closing Redis connection', { error: error.message });
      throw error;
    }
  }

  public getClient(): RedisClientType {
    return this.client;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis health check failed', { error: error.message });
      return false;
    }
  }

  // Basic operations
  public async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.error('Redis SET error', { key, error: error.message });
      throw error;
    }
  }

  public async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error('Redis GET error', { key, error: error.message });
      throw error;
    }
  }

  public async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error('Redis DEL error', { key, error: error.message });
      throw error;
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error('Redis EXISTS error', { key, error: error.message });
      throw error;
    }
  }

  public async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.client.expire(key, seconds);
    } catch (error) {
      this.logger.error('Redis EXPIRE error', { key, error: error.message });
      throw error;
    }
  }

  public async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      this.logger.error('Redis TTL error', { key, error: error.message });
      throw error;
    }
  }

  // Hash operations
  public async hSet(key: string, field: string, value: string): Promise<void> {
    try {
      await this.client.hSet(key, field, value);
    } catch (error) {
      this.logger.error('Redis HSET error', { key, field, error: error.message });
      throw error;
    }
  }

  public async hGet(key: string, field: string): Promise<string | undefined> {
    try {
      return await this.client.hGet(key, field);
    } catch (error) {
      this.logger.error('Redis HGET error', { key, field, error: error.message });
      throw error;
    }
  }

  public async hGetAll(key: string): Promise<Record<string, string>> {
    try {
      return await this.client.hGetAll(key);
    } catch (error) {
      this.logger.error('Redis HGETALL error', { key, error: error.message });
      throw error;
    }
  }

  public async hDel(key: string, field: string): Promise<void> {
    try {
      await this.client.hDel(key, field);
    } catch (error) {
      this.logger.error('Redis HDEL error', { key, field, error: error.message });
      throw error;
    }
  }

  // List operations
  public async lPush(key: string, ...elements: string[]): Promise<number> {
    try {
      return await this.client.lPush(key, elements);
    } catch (error) {
      this.logger.error('Redis LPUSH error', { key, error: error.message });
      throw error;
    }
  }

  public async rPush(key: string, ...elements: string[]): Promise<number> {
    try {
      return await this.client.rPush(key, elements);
    } catch (error) {
      this.logger.error('Redis RPUSH error', { key, error: error.message });
      throw error;
    }
  }

  public async lPop(key: string): Promise<string | null> {
    try {
      return await this.client.lPop(key);
    } catch (error) {
      this.logger.error('Redis LPOP error', { key, error: error.message });
      throw error;
    }
  }

  public async rPop(key: string): Promise<string | null> {
    try {
      return await this.client.rPop(key);
    } catch (error) {
      this.logger.error('Redis RPOP error', { key, error: error.message });
      throw error;
    }
  }

  public async lRange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.client.lRange(key, start, stop);
    } catch (error) {
      this.logger.error('Redis LRANGE error', { key, error: error.message });
      throw error;
    }
  }

  // Set operations
  public async sAdd(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.sAdd(key, members);
    } catch (error) {
      this.logger.error('Redis SADD error', { key, error: error.message });
      throw error;
    }
  }

  public async sRem(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.sRem(key, members);
    } catch (error) {
      this.logger.error('Redis SREM error', { key, error: error.message });
      throw error;
    }
  }

  public async sMembers(key: string): Promise<string[]> {
    try {
      return await this.client.sMembers(key);
    } catch (error) {
      this.logger.error('Redis SMEMBERS error', { key, error: error.message });
      throw error;
    }
  }

  public async sIsMember(key: string, member: string): Promise<boolean> {
    try {
      return await this.client.sIsMember(key, member);
    } catch (error) {
      this.logger.error('Redis SISMEMBER error', { key, member, error: error.message });
      throw error;
    }
  }

  // Sorted set operations
  public async zAdd(key: string, score: number, member: string): Promise<number> {
    try {
      return await this.client.zAdd(key, { score, value: member });
    } catch (error) {
      this.logger.error('Redis ZADD error', { key, score, member, error: error.message });
      throw error;
    }
  }

  public async zRange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.client.zRange(key, start, stop);
    } catch (error) {
      this.logger.error('Redis ZRANGE error', { key, error: error.message });
      throw error;
    }
  }

  public async zRem(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.zRem(key, members);
    } catch (error) {
      this.logger.error('Redis ZREM error', { key, error: error.message });
      throw error;
    }
  }

  // Pattern matching
  public async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      this.logger.error('Redis KEYS error', { pattern, error: error.message });
      throw error;
    }
  }

  public async flushAll(): Promise<void> {
    try {
      await this.client.flushAll();
      this.logger.info('🗑️ Redis database flushed');
    } catch (error) {
      this.logger.error('Redis FLUSHALL error', { error: error.message });
      throw error;
    }
  }

  // Utility methods for session management
  public async setSession(sessionId: string, data: any, ttl: number = 3600): Promise<void> {
    const key = `session:${sessionId}`;
    await this.set(key, JSON.stringify(data), ttl);
  }

  public async getSession(sessionId: string): Promise<any | null> {
    const key = `session:${sessionId}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  public async deleteSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.del(key);
  }

  // Rate limiting
  public async incrementRateLimit(identifier: string, windowMs: number): Promise<number> {
    const key = `rate_limit:${identifier}`;
    const current = await this.client.incr(key);
    
    if (current === 1) {
      await this.expire(key, Math.ceil(windowMs / 1000));
    }
    
    return current;
  }

  // Cache management
  public async cacheSet(key: string, value: any, ttl: number = 3600): Promise<void> {
    await this.set(`cache:${key}`, JSON.stringify(value), ttl);
  }

  public async cacheGet<T = any>(key: string): Promise<T | null> {
    const data = await this.get(`cache:${key}`);
    return data ? JSON.parse(data) : null;
  }

  public async cacheDel(key: string): Promise<void> {
    await this.del(`cache:${key}`);
  }

  // Pub/Sub
  public async publish(channel: string, message: string): Promise<void> {
    try {
      await this.client.publish(channel, message);
    } catch (error) {
      this.logger.error('Redis PUBLISH error', { channel, error: error.message });
      throw error;
    }
  }

  public async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    try {
      const subscriber = this.client.duplicate();
      await subscriber.connect();
      
      await subscriber.subscribe(channel, (message) => {
        callback(message);
      });
    } catch (error) {
      this.logger.error('Redis SUBSCRIBE error', { channel, error: error.message });
      throw error;
    }
  }

  // Statistics and monitoring
  public async getInfo(): Promise<any> {
    try {
      const info = await this.client.info();
      const lines = info.split('\r\n');
      const stats: Record<string, any> = {};
      
      for (const line of lines) {
        if (line && !line.startsWith('#')) {
          const [key, value] = line.split(':');
          if (key && value) {
            stats[key] = value;
          }
        }
      }
      
      return stats;
    } catch (error) {
      this.logger.error('Redis INFO error', { error: error.message });
      return null;
    }
  }

  public async getMemoryUsage(): Promise<number> {
    try {
      const info = await this.getInfo();
      return info ? parseInt(info.used_memory) : 0;
    } catch (error) {
      this.logger.error('Error getting Redis memory usage', { error: error.message });
      return 0;
    }
  }

  public async getConnectedClients(): Promise<number> {
    try {
      const info = await this.getInfo();
      return info ? parseInt(info.connected_clients) : 0;
    } catch (error) {
      this.logger.error('Error getting Redis client count', { error: error.message });
      return 0;
    }
  }
}

export { RedisConnection };