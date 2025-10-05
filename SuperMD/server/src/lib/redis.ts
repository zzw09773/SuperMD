import { createClient } from 'redis';

// Create Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('❌ Redis: Max reconnection attempts reached');
        return new Error('Max reconnection attempts reached');
      }
      return Math.min(retries * 100, 3000);
    },
  },
});

// Error handling
redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('🔌 Redis: Connected');
});

redisClient.on('ready', () => {
  console.log('✅ Redis: Ready');
});

// Initialize connection
let isRedisAvailable = false;

export const initializeRedis = async () => {
  try {
    await redisClient.connect();
    isRedisAvailable = true;
    console.log('🚀 Redis initialized successfully');
  } catch (error) {
    console.warn('⚠️  Redis not available, caching will be disabled');
    console.warn('   To enable caching, start Redis: docker run -d -p 6379:6379 redis:alpine');
    isRedisAvailable = false;
  }
};

// Cache helper functions
export const cacheService = {
  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    if (!isRedisAvailable) return null;

    try {
      const value = await redisClient.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  },

  /**
   * Set cached value with TTL (time to live in seconds)
   */
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    if (!isRedisAvailable) return;

    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Redis set error:', error);
    }
  },

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    if (!isRedisAvailable) return;

    try {
      await redisClient.del(key);
    } catch (error) {
      console.error('Redis delete error:', error);
    }
  },

  /**
   * Delete all keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    if (!isRedisAvailable) return;

    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      console.error('Redis deletePattern error:', error);
    }
  },

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return isRedisAvailable;
  },
};

export default redisClient;
