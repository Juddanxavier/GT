import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { shipments, user } from '../db/schema';
import { notificationQueue } from '../queues';
import { cacheClient } from '../redis';
import { isMajorEvent, statusToEventType } from './event-map';
import type { InternalStatus } from '@repo/types/status';
import type { NormalizedEvent } from '../shipment-providers/types';

// In-memory LRU cooldown fallback when Redis is unavailable (D-13)
class SimpleLRU<K, V> {
  private max: number;
  map = new Map<K, V>();
  constructor(max: number) { this.max = max; }

  get(key: K): V | undefined {
    const val = this.map.get(key);
    if (val !== undefined) {
      this.map.delete(key);
      this.map.set(key, val);
    }
    return val;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.max) {
      const firstKey = this.map.keys().next().value as K;
      this.map.delete(firstKey);
    }
    this.map.set(key, value);
  }

  has(key: K): boolean { return this.map.get(key) !== undefined; }

  delete(key: K): void { this.map.delete(key); }
}

// ponytail: LRU uses implicit eviction + setTimeout cleanup, no Map<key,expiry>. Add precise TTL if cooldown precision needed.
const cooldownCache = new SimpleLRU<string, boolean>(10000);

type ShipmentBrief = {
  id: string;
  trackingNo: string;
  carrier: string | null;
  origin: string | null;
  destination: string | null;
  estimatedDelivery: string | null;
  status: string;
  tenantId: string;
  customerEmail: string | null;
  customerPhone: string | null;
  customerName: string | null;
};

const COOLDOWN_SECONDS = 1800;

export async function notifyTrackingEvents(
  shipmentId: string,
  tenantId: string,
  events: NormalizedEvent[],
  currentStatus: string,
): Promise<void> {
  try {
    const [ship] = await db
      .select({
        id: shipments.id,
        trackingNo: shipments.trackingNo,
        carrier: shipments.carrier,
        origin: shipments.origin,
        destination: shipments.destination,
        estimatedDelivery: shipments.estimatedDelivery,
        userId: shipments.userId,
        contactEmail: shipments.contactEmail,
        contactPhone: shipments.contactPhone,
      })
      .from(shipments)
      .where(and(eq(shipments.id, shipmentId), eq(shipments.tenantId, tenantId)))
      .limit(1);

    if (!ship) return;

    let customerEmail: string | null = null;
    let customerPhone: string | null = null;
    let customerName: string | null = null;

    if (ship.userId) {
      const [cust] = await db
        .select({ name: user.name, email: user.email, phone: user.phone })
        .from(user)
        .where(eq(user.id, ship.userId))
        .limit(1);

      if (cust) {
        customerEmail = cust.email;
        customerPhone = cust.phone ?? null;
        customerName = cust.name;
      }
    }

    // Fallback: fill in any missing contact fields from the shipment-level fields
    if (!customerEmail) {
      customerEmail = ship.contactEmail;
    }
    if (!customerPhone) {
      customerPhone = ship.contactPhone;
    }

    const brief: ShipmentBrief = {
      id: ship.id,
      trackingNo: ship.trackingNo,
      carrier: ship.carrier,
      origin: ship.origin,
      destination: ship.destination,
      estimatedDelivery: ship.estimatedDelivery?.toISOString() ?? null,
      status: currentStatus,
      tenantId,
      customerEmail,
      customerPhone,
      customerName,
    };

    for (const event of events) {
      await handleTrackingEvent(
        event.status,
        brief,
        `${event.eventTime.toISOString()}:${event.subStatus ?? ''}`,
      );
    }
  } catch (err) {
    console.error('[notifyTrackingEvents] error:', err);
  }
}

export async function handleTrackingEvent(
  status: InternalStatus,
  shipment: ShipmentBrief,
  eventId: string,
): Promise<void> {
  if (!isMajorEvent(status)) return;

  const eventType = statusToEventType(status);
  if (!eventType) return;

  if (!shipment.customerEmail && !shipment.customerPhone) return;

  // Per-status cooldown: Redis with in-memory LRU fallback (D-13)
  const cooldownKey = `${shipment.id}:${status}`;
  try {
    if (cacheClient) {
      const redisKey = `cooldown:notify:${cooldownKey}`;
      const acquired = await cacheClient.set(redisKey, '1', 'EX', COOLDOWN_SECONDS, 'NX');
      if (acquired !== 'OK') {
        console.log(`[notifications] cooldown active for ${shipment.id} status ${status}`);
        return;
      }
      cooldownCache.set(cooldownKey, true);
      setTimeout(() => { cooldownCache.delete(cooldownKey); }, COOLDOWN_SECONDS * 1000);
    } else {
      // Redis unavailable — in-memory LRU fallback
      if (cooldownCache.has(cooldownKey)) {
        console.log(`[notifications] LRU cooldown active for ${shipment.id} status ${status}`);
        return;
      }
      cooldownCache.set(cooldownKey, true);
      setTimeout(() => { cooldownCache.delete(cooldownKey); }, COOLDOWN_SECONDS * 1000);
    }
  } catch (err) {
    console.error('[notifications] Redis error — falling back to in-memory LRU:', err instanceof Error ? err.message : err);
    if (cooldownCache.has(cooldownKey)) {
      console.log(`[notifications] LRU cooldown active for ${shipment.id} status ${status}`);
      return;
    }
    cooldownCache.set(cooldownKey, true);
    setTimeout(() => { cooldownCache.delete(cooldownKey); }, COOLDOWN_SECONDS * 1000);
  }

  if (!notificationQueue) {
    console.error('[notifications] Redis/BullMQ not available — notification SKIPPED. Customer will NOT receive status update.', shipment.id, shipment.trackingNo);
    return;
  }

  await notificationQueue.add('notify', {
    shipmentId: shipment.id,
    eventId,
    eventType,
    tenantId: shipment.tenantId,
    trackingNo: shipment.trackingNo,
    carrier: shipment.carrier ?? undefined,
    origin: shipment.origin ?? undefined,
    destination: shipment.destination ?? undefined,
    estimatedDelivery: shipment.estimatedDelivery ?? undefined,
    customerName: shipment.customerName ?? undefined,
    customerEmail: shipment.customerEmail ?? undefined,
    customerPhone: shipment.customerPhone ?? undefined,
  });
}
