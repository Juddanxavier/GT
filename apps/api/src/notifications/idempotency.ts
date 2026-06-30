import { createHash } from 'node:crypto';
import { cacheClient } from '../redis';

const NOTIFICATION_TTL = 7 * 24 * 3600;

export async function checkAndSetIdempotency(
  eventId: string,
  shipmentId: string,
  channel: 'email' | 'whatsapp',
): Promise<boolean> {
  if (!cacheClient) {
    console.warn('[idempotency] Redis cache not available — skipping dedup');
    return false;
  }

  try {
    const key = `idempotent:${channel}:${shipmentId}:${eventId}`;
    const result = await cacheClient.setnx(key, '1');
    if (result === 1) {
      await cacheClient.expire(key, NOTIFICATION_TTL);
      return false;
    }
    return true;
  } catch {
    console.warn('[idempotency] Redis error — allowing (skipping dedup)');
    return false;
  }
}

const WEBHOOK_TTL = 3600; // 1 hour — enough to catch retries, short enough to not fill Redis

/**
 * Check whether a webhook payload has already been processed.
 *
 * Uses SHA-256 of the raw body as the idempotency key so that duplicate
 * deliveries (same payload, same hash) are silently acknowledged without
 * re-processing.
 *
 * Returns `true` if already seen (duplicate), `false` if new (first time).
 * Gracefully degrades to `false` if Redis is unavailable.
 */
export async function checkWebhookIdempotency(rawBody: string): Promise<boolean> {
  if (!cacheClient) {
    console.warn('[webhook-idempotency] Redis not available — allowing');
    return false;
  }

  try {
    const hash = createHash('sha256').update(rawBody).digest('hex');
    const key = `webhook:idempotent:${hash}`;
    const result = await cacheClient.setnx(key, '1');
    if (result === 1) {
      await cacheClient.expire(key, WEBHOOK_TTL);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[webhook-idempotency] Redis error — allowing:', err);
    return false;
  }
}
