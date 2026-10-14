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
    retryStrategy: () => null, // don't retry — fail fast so lazyConnect surfaces the error immediately
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
