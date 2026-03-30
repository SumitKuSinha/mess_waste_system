const redis = require('redis');

// Create Redis client
const redisClient = redis.createClient({
  host: 'localhost',
  port: 6379,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('Max Redis reconnection attempts reached');
        return new Error('Max retries reached');
      }
      return retries * 50;
    }
  }
});

// Handle Redis connection events
redisClient.on('connect', () => {
  console.log('✅ Redis Connected Successfully');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Connection Error:', err.message);
});

redisClient.on('ready', () => {
  console.log('✅ Redis is Ready');
});

redisClient.on('end', () => {
  console.log('🔴 Redis Connection Closed');
});

// Connect to Redis
redisClient.connect().catch((err) => {
  console.error('❌ Failed to connect to Redis:', err.message);
});

// Utility function to set cache with expiration (TTL in seconds)
const setCache = async (key, value, ttl = 3600) => {
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error setting cache for key ${key}:`, error);
    return false;
  }
};

// Utility function to get cache
const getCache = async (key) => {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Error getting cache for key ${key}:`, error);
    return null;
  }
};

// Utility function to delete cache
const deleteCache = async (key) => {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error(`Error deleting cache for key ${key}:`, error);
    return false;
  }
};

// Utility function to delete multiple cache keys
const deleteMultipleCache = async (keys) => {
  try {
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return true;
  } catch (error) {
    console.error('Error deleting multiple cache keys:', error);
    return false;
  }
};

module.exports = {
  redisClient,
  setCache,
  getCache,
  deleteCache,
  deleteMultipleCache
};
