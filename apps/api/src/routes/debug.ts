import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { shipments, customers } from '../db/schema';
import { notificationQueue } from '../queues';
import { requireRole } from '../middleware/authorization';

const app = new Hono();

app.post('/fire-notification', requireRole('superadmin'), async (c) => {
  const { shipmentId, eventType } = await c.req.json<{
    shipmentId: string;
    eventType: 'InfoReceived' | 'InTransit' | 'OutForDelivery' | 'Delivered' | 'Exception';
  }>();

  if (!shipmentId || !eventType) {
    return c.json({ error: 'shipmentId and eventType are required' }, 400);
  }

  const ship = await db
    .select({
      id: shipments.id,
      trackingNo: shipments.trackingNo,
      tenantId: shipments.tenantId,
    })
    .from(shipments)
    .where(eq(shipments.id, shipmentId))
    .limit(1);

  if (!ship.length) {
    return c.json({ error: 'Shipment not found' }, 404);
  }

  if (!notificationQueue) {
    return c.json({ error: 'Redis/BullMQ not available' }, 503);
  }

  await notificationQueue.add('notify', {
    shipmentId: ship[0]!.id,
    eventId: `manual:${Date.now()}`,
    eventType,
    tenantId: ship[0]!.tenantId,
    trackingNo: ship[0]!.trackingNo,
  });

  return c.json({ message: `Notification queued for ${shipmentId} (${eventType})` });
});

export default app;
