import { sql } from 'drizzle-orm';
import { db } from '../db';
import { trackingEvents } from '../db/schema';
import type { NormalizedEvent } from './types';

export async function insertEvents(
  shipmentId: string,
  tenantId: string,
  events: NormalizedEvent[],
): Promise<number> {
  if (events.length === 0) return 0;

  const batch = events.map((event) => ({
    shipmentId,
    tenantId,
    status: event.status,
    subStatus: event.subStatus,
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
  }));

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
