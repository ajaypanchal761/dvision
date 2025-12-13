const redis = require('redis');

let redisClient = null;
let connectionAttempted = false;
let isConnected = false;

const connectRedis = async () => {
  // Prevent multiple connection attempts
  if (connectionAttempted) {
    return redisClient;
  }

  connectionAttempted = true;

  // Check if Redis is disabled via environment variable
  if (process.env.REDIS_ENABLED === 'false') {
    console.log('Redis is disabled. Using in-memory storage.');
    return null;
  }

  try {
    redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        reconnectStrategy: (retries) => {
          // Don't reconnect if we've already given up
          if (retries > 3) {
            return false; // Stop reconnecting
          }
          return Math.min(retries * 100, 3000); // Exponential backoff
        },
        connectTimeout: 5000, // 5 second timeout
      }
    });

    // Only log errors once, not repeatedly
    let errorLogged = false;
    redisClient.on('error', (err) => {
      if (!errorLogged && !isConnected) {
        console.warn('Redis connection failed. OTP service will use in-memory storage.');
        console.warn('Note: In-memory storage only works for single server instances.');
        if (process.env.NODE_ENV === 'development') {
          console.warn('To use Redis, start Redis server or set REDIS_ENABLED=false in .env');
        }
        errorLogged = true;
      }
      // Don't log repeated errors
    });

    redisClient.on('connect', () => {
      isConnected = true;
      console.log('✓ Redis Client Connected');
    });

    redisClient.on('ready', () => {
      isConnected = true;
      console.log('✓ Redis Client Ready');
    });

    redisClient.on('end', () => {
      isConnected = false;
    });

    // Try to connect with timeout
    await Promise.race([
      redisClient.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
      )
    ]);

    return redisClient;
  } catch (error) {
    // Connection failed - this is okay, we'll use in-memory storage
    redisClient = null;
    isConnected = false;

    // Only log in development or if explicitly enabled
    if (process.env.NODE_ENV === 'development' || process.env.REDIS_ENABLED === 'true') {
      console.warn('Redis connection failed. OTP service will use in-memory storage.');
      console.warn('Note: In-memory storage only works for single server instances.');
    }

    // In production, if Redis is required, throw error
    if (process.env.NODE_ENV === 'production' && process.env.REDIS_ENABLED === 'true') {
      throw error;
    }

    return null;
  }
};

const getRedisClient = () => {
  // Only return client if it's connected
  if (redisClient && isConnected) {
    return redisClient;
  }
  return null;
};

module.exports = { connectRedis, getRedisClient };

