import { cacheClient } from './redis';

function sanitizeKeyPart(part: string): string {
  // Replace colons, newlines, spaces, and other Redis-problematic characters
  return part.replace(/[\s:;\r\n]+/g, '_').replace(/[^a-zA-Z0-9_\-.:@]/g, '');
}

function prefixKey(tenantId: string | null, key: string): string {
  const safeKey = sanitizeKeyPart(key);
  if (tenantId) {
    return `t:${sanitizeKeyPart(tenantId)}:${safeKey}`;
  }
  return `global:${safeKey}`;
}

export async function cacheGet<T>(tenantId: string | null, key: string): Promise<T | null> {
  if (!cacheClient) return null;
  try {
    const raw = await cacheClient.get(prefixKey(tenantId, key));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(
  tenantId: string | null,
  key: string,
  value: unknown,
  ttlSeconds?: number,
): Promise<void> {
  if (!cacheClient) return;
  try {
    const fullKey = prefixKey(tenantId, key);
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await cacheClient.setex(fullKey, ttlSeconds, serialized);
    } else {
      await cacheClient.set(fullKey, serialized);
    }
  } catch (err) {
    console.error('[cache] set error:', err);
  }
}

export async function cacheDel(tenantId: string | null, key: string): Promise<void> {
  if (!cacheClient) return;
  try {
    await cacheClient.del(prefixKey(tenantId, key));
  } catch (err) {
    console.error('[cache] del error:', err);
  }
}

export async function withCache<T>(
  tenantId: string | null,
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number,
): Promise<T> {
  if (!tenantId) return fn();
  const cached = await cacheGet<T>(tenantId, key);
  if (cached !== null) return cached;
  const data = await fn();
  await cacheSet(tenantId, key, data, ttlSeconds);
  return data;
}

export async function cacheFlushTenant(tenantId: string): Promise<void> {
  if (!cacheClient) return;
  try {
    const pattern = `t:${tenantId}:*`;
    let cursor = '0';
    do {
      const result = await cacheClient.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
      cursor = result[0];
      const keys = result[1];
      if (keys.length > 0) {
        await cacheClient.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    console.error('[cache] flush error:', err);
  }
}

export async function cacheDelPattern(tenantId: string | null, suffix: string): Promise<void> {
  if (!cacheClient) return;
  try {
    const prefix = tenantId ? `t:${tenantId}:` : `global:`;
    const pattern = `${prefix}${suffix}`;
    let cursor = '0';
    do {
      const result = await cacheClient.scan(cursor, 'MATCH', pattern, 'COUNT', '100');
      cursor = result[0];
      const keys = result[1];
      if (keys.length > 0) {
        await cacheClient.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    console.error('[cache] delPattern error:', err);
  }
}
