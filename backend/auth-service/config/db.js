const mongoose = require('mongoose');
const redis = require('redis');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'auth-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// MongoDB connection
const connectMongoDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gaming_tournament';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false
    });

    logger.info('MongoDB connected successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        logger.error('Error during MongoDB shutdown:', err);
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Redis connection
let redisClient = null;

const connectRedis = async () => {
  try {
    const redisURL = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = redis.createClient({
      url: redisURL,
      socket: {
        connectTimeout: 10000,
        lazyConnect: true
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('end', () => {
      logger.warn('Redis client connection ended');
    });

    await redisClient.connect();

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        if (redisClient) {
          await redisClient.quit();
          logger.info('Redis connection closed through app termination');
        }
      } catch (err) {
        logger.error('Error during Redis shutdown:', err);
      }
    });

  } catch (error) {
    logger.error('Redis connection failed:', error);
    // Don't exit process for Redis failure, continue without caching
  }
};

// Health check function
const healthCheck = async () => {
  const health = {
    mongodb: 'unknown',
    redis: 'unknown',
    timestamp: new Date().toISOString()
  };

  try {
    if (mongoose.connection.readyState === 1) {
      health.mongodb = 'connected';
    } else {
      health.mongodb = 'disconnected';
    }
  } catch (error) {
    health.mongodb = 'error';
  }

  try {
    if (redisClient && redisClient.isReady) {
      await redisClient.ping();
      health.redis = 'connected';
    } else {
      health.redis = 'disconnected';
    }
  } catch (error) {
    health.redis = 'error';
  }

  return health;
};

// Get Redis client
const getRedisClient = () => {
  return redisClient;
};

// Cache helper functions
const cacheGet = async (key) => {
  if (!redisClient || !redisClient.isReady) return null;
  
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Redis get error:', error);
    return null;
  }
};

const cacheSet = async (key, value, ttl = 3600) => {
  if (!redisClient || !redisClient.isReady) return false;
  
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error('Redis set error:', error);
    return false;
  }
};

const cacheDelete = async (key) => {
  if (!redisClient || !redisClient.isReady) return false;
  
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error('Redis delete error:', error);
    return false;
  }
};

const cacheFlush = async () => {
  if (!redisClient || !redisClient.isReady) return false;
  
  try {
    await redisClient.flushAll();
    return true;
  } catch (error) {
    logger.error('Redis flush error:', error);
    return false;
  }
};

module.exports = {
  connectMongoDB,
  connectRedis,
  healthCheck,
  getRedisClient,
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheFlush,
  logger
};
