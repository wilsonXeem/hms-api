import { createClient } from 'redis';
import { config } from './app.config';
import { logger } from '../utils/logger.util';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    connectTimeout: 5000,
    keepAlive: 30000,
    reconnectStrategy: false // Disable reconnection
  },
  database: 0
});

redisClient.on('error', (err) => {
  // Silently handle Redis errors in development
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Redis unavailable, continuing without cache');
  } else {
    logger.error('Redis Client Error:', err);
  }
});

redisClient.on('connect', () => {
  logger.info('✅ Redis connected successfully');
});

export const connectRedis = async () => {
  if (!process.env.REDIS_URL && process.env.NODE_ENV === 'development') {
    console.log('⚠️  Redis not configured, skipping connection');
    return;
  }
  
  try {
    await redisClient.connect();
  } catch (error) {
    console.warn('Redis connection failed, continuing without cache');
  }
};

export const closeRedis = async () => {
  try {
    await redisClient.quit();
  } catch (error) {
    logger.error('Error closing Redis connection:', error);
  }
};

export { redisClient };