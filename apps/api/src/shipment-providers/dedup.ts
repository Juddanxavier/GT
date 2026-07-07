import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import { trackingEvents } from '../db/schema';
import type { NormalizedEvent } from './types';

// ponytail: hash dedup — if description is also unreliable across providers, upgrade to full payload hash
function eventDedupKey(event: NormalizedEvent): string {
  if (event.subStatus && event.subStatus.trim().length > 0) {
    return event.subStatus;
  }
  // Fallback: SHA-256 hash of event description when subStatus is null/empty
  const hash = createHash('sha256')
    .update(`${event.eventTime.toISOString()}:${event.description}:${event.location}`)
    .digest('hex')
    .slice(0, 32);
  return `hash:${hash}`;
}

export async function insertEvents(
  shipmentId: string,
  tenantId: string,
  events: NormalizedEvent[],
): Promise<number> {
  if (events.length === 0) return 0;

  const batch = events.map((event) => {
    const dedupKey = eventDedupKey(event);
    return {
      shipmentId,
      tenantId,
      status: event.status,
      subStatus: dedupKey,
      description: event.description?.slice(0, 1000) ?? '',
      location: event.location?.slice(0, 255) ?? '',
      carrier: event.carrier,
      carrierCode: event.carrierCode,
      eventTime: event.eventTime,
      raw: sql`${JSON.stringify({
        status: event.status,
        subStatus: event.subStatus,
        description: event.description?.slice(0, 1000),
        location: event.location?.slice(0, 255),
      })}::jsonb`,
    };
  });

  const result = await db
    .insert(trackingEvents)
    .values(batch)
    .onConflictDoNothing({
      target: [
        trackingEvents.shipmentId,
        trackingEvents.eventTime,
        trackingEvents.subStatus,
      ],
    })
    .returning({ id: trackingEvents.id });

  return result.length;
}
