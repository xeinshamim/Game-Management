const mongoose = require('mongoose');
const Redis = require('redis');
const logger = require('./logger');

let redisClient = null;

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Redis connection
const connectRedis = async () => {
  try {
    redisClient = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      retry_strategy: (options) => {
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    await redisClient.connect();
  } catch (error) {
    logger.error('Redis connection error:', error);
    // Don't exit process for Redis connection failure
  }
};

// Cache utility functions
const cacheGet = async (key) => {
  if (!redisClient) return null;
  
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Redis get error:', error);
    return null;
  }
};

const cacheSet = async (key, value, ttl = 300) => {
  if (!redisClient) return;
  
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  } catch (error) {
    logger.error('Redis set error:', error);
  }
};

const cacheDelete = async (key) => {
  if (!redisClient) return;
  
  try {
    await redisClient.del(key);
  } catch (error) {
    logger.error('Redis delete error:', error);
  }
};

const cacheFlush = async () => {
  if (!redisClient) return;
  
  try {
    await redisClient.flushAll();
    logger.info('Redis cache flushed');
  } catch (error) {
    logger.error('Redis flush error:', error);
  }
};

// Health check
const healthCheck = async () => {
  const mongoStatus = mongoose.connection.readyState === 1;
  const redisStatus = redisClient && redisClient.isReady;
  
  return {
    mongodb: mongoStatus ? 'connected' : 'disconnected',
    redis: redisStatus ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  };
};

// Initialize connections
const initializeConnections = async () => {
  await connectDB();
  await connectRedis();
};

module.exports = {
  connectDB,
  connectRedis,
  initializeConnections,
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheFlush,
  healthCheck,
  redisClient
};
