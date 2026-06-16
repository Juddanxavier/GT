import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db';
import { trackingEvents } from '../db/schema';
import { cacheClient } from '../redis';
import type { NormalizedEvent } from './types';

function dedupKey(shipmentId: string, event: NormalizedEvent): string {
  const ts = event.eventTime.toISOString().slice(0, 16);
  return `dedup:event:${shipmentId}:${ts}:${event.subStatus}`;
}

export async function isDuplicate(
  shipmentId: string,
  event: NormalizedEvent,
): Promise<boolean> {
  if (cacheClient) {
    const exists = await cacheClient.get(dedupKey(shipmentId, event));
    if (exists === '1') return true;
  }
  return false;
}

export async function markSeen(
  shipmentId: string,
  event: NormalizedEvent,
): Promise<void> {
  if (cacheClient) {
    await cacheClient.set(dedupKey(shipmentId, event), '1', 'EX', 86400);
  }
}

export async function insertEvent(
  shipmentId: string,
  tenantId: string,
  event: NormalizedEvent,
): Promise<boolean> {
  if (await isDuplicate(shipmentId, event)) return false;

  try {
    await db
      .insert(trackingEvents)
      .values({
        shipmentId,
        tenantId,
        status: event.status,
        subStatus: event.subStatus,
        description: event.description,
        location: event.location,
        carrier: event.carrier,
        carrierCode: event.carrierCode,
        eventTime: event.eventTime,
        raw: sql`${JSON.stringify(event.raw)}::jsonb`,
      })
      .onConflictDoNothing({
        target: [
          trackingEvents.shipmentId,
          trackingEvents.eventTime,
          trackingEvents.subStatus,
        ],
      });
    await markSeen(shipmentId, event);
    return true;
  } catch {
    return false;
  }
}

export async function insertEvents(
  shipmentId: string,
  tenantId: string,
  events: NormalizedEvent[],
): Promise<number> {
  let inserted = 0;
  for (const event of events) {
    if (await insertEvent(shipmentId, tenantId, event)) inserted++;
  }
  return inserted;
}
