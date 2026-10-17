import { Redis } from 'ioredis';
import { logger } from './logger';

const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;

export const bullConnectionOptions: Record<string, unknown> | null = REDIS_URL
  ? { url: REDIS_URL, maxRetriesPerRequest: null, enableReadyCheck: false }
  : null;

function createBullConnection(): Redis | null {
  if (!REDIS_URL) return null;
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });
  client.on('error', (err) => logger.error({ err }, 'bull connection error'));
  return client;
}

function createCacheClient(): Redis | null {
  if (!REDIS_URL) return null;
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 20,
    lazyConnect: true,
    // Keep retrying so a boot-time Redis outage does not permanently disable
    // dedup, cooldown and caching.
    retryStrategy: (times) => Math.min(times * 200, 2000),
    // But never park commands in the offline queue waiting for that
    // reconnection — callers must fail fast. With the queue enabled, any cache
    // call issued while Redis is unreachable blocks until the connection
    // retries, which hangs every request that passes through the rate limiter.
    enableOfflineQueue: false,
  });
  client.on('error', (err) => logger.error({ err }, 'cache client error'));
  return client;
}

export const bullConnection = createBullConnection();
export const cacheClient = createCacheClient();

export async function connectRedis(): Promise<void> {
  if (cacheClient) {
    try {
      await cacheClient.connect();
      logger.info('cache client connected');
    } catch (err) {
      logger.error({ err }, 'cache client connection failed');
    }
  }
  if (bullConnection) {
    try {
      await bullConnection.connect();
      logger.info('bull connection ready');
    } catch (err) {
      logger.error({ err }, 'bull connection failed');
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
