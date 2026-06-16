import { Redis } from 'ioredis';

const REDIS_URL = process.env.UPSTASH_REDIS_URL;

function createBullConnection(): Redis | null {
  if (!REDIS_URL) return null;
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

function createCacheClient(): Redis | null {
  if (!REDIS_URL) return null;
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: 20,
    lazyConnect: true,
  });
}

export const bullConnection = createBullConnection();
export const cacheClient = createCacheClient();

export async function connectRedis(): Promise<void> {
  if (cacheClient) {
    try {
      await cacheClient.connect();
      console.log('[redis] cache client connected');
    } catch (err) {
      console.error('[redis] cache client connection failed:', err);
    }
  }
  if (bullConnection) {
    try {
      await bullConnection.connect();
      console.log('[redis] bull connection ready');
    } catch (err) {
      console.error('[redis] bull connection failed:', err);
    }
  }
}

export async function disconnectRedis(): Promise<void> {
  if (bullConnection) {
    await bullConnection.quit();
  }
  if (cacheClient) {
    await cacheClient.quit();
  }
}
