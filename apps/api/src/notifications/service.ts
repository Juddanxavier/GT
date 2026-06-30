import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { shipments, customers } from '../db/schema';
import { notificationQueue } from '../queues';
import { cacheClient } from '../redis';
import { isMajorEvent, statusToEventType } from './event-map';
import type { InternalStatus, NormalizedEvent } from '../shipment-providers/types';

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
        customerId: shipments.customerId,
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

    if (ship.customerId) {
      const [cust] = await db
        .select({ name: customers.name, email: customers.email, phone: customers.phone })
        .from(customers)
        .where(eq(customers.id, ship.customerId))
        .limit(1);

      if (cust) {
        customerEmail = cust.email;
        customerPhone = cust.phone;
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

  // Per-status cooldown: prevents same-status spam while allowing different status transitions
  if (cacheClient) {
    try {
      const cooldownKey = `cooldown:notify:${shipment.id}:${status}`;
      const acquired = await cacheClient.set(cooldownKey, '1', 'EX', COOLDOWN_SECONDS, 'NX');
      if (acquired !== 'OK') {
        console.log(`[notifications] cooldown active for ${shipment.id} status ${status}`);
        return;
      }
    } catch {
      console.warn('[notifications] Redis error — skipping cooldown');
    }
  }

  if (!notificationQueue) {
    console.warn('[notifications] Redis not available — skipping notification');
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
