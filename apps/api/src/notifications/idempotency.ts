import { cacheClient } from '../redis';

const IDEMPOTENCY_TTL = 7 * 24 * 3600;

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
      await cacheClient.expire(key, IDEMPOTENCY_TTL);
      return false;
    }
    return true;
  } catch {
    console.warn('[idempotency] Redis error — allowing (skipping dedup)');
    return false;
  }
}
