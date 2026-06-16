import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { shipments } from '../db/schema';
import { getProvider } from '../shipment-providers';
import { insertEvents } from '../shipment-providers/dedup';
import { notifyTrackingEvents } from '../notifications/service';
import { emitToTenant } from '../realtime';

const app = new Hono();

async function handleWebhook(
  providerName: string,
  body: unknown,
  signature: string | null,
  c: { json: (arg: unknown, status?: number) => Response },
): Promise<Response> {
  try {
    const provider = getProvider();
    if (provider.name !== providerName) {
      return c.json({ error: `Not the active provider (expected ${provider.name})` }, 400);
    }

    const rawBody = JSON.stringify(body);
    if (!provider.verifyWebhook(rawBody, signature)) {
      return c.json({ error: 'Invalid signature' }, 401);
    }

    const payload = body as {
      tracking_number?: string;
      events?: Array<{
        status: string;
        sub_status: string;
        description: string;
        location: string;
        time_utc: string;
      }>;
    };

    if (!payload.tracking_number) {
      return c.json({ error: 'Missing tracking_number' }, 400);
    }

    const shipment = await db
      .select({
        id: shipments.id,
        tenantId: shipments.tenantId,
        trackingNo: shipments.trackingNo,
        carrier: shipments.carrier,
        origin: shipments.origin,
        destination: shipments.destination,
        estimatedDelivery: shipments.estimatedDelivery,
        status: shipments.status,
        customerId: shipments.customerId,
      })
      .from(shipments)
      .where(eq(shipments.trackingNo, payload.tracking_number))
      .limit(1);

    if (!shipment.length) {
      return c.json({ error: 'Unknown tracking number' }, 404);
    }

    const result = await provider.track(payload.tracking_number);
    const inserted = await insertEvents(shipment[0]!.id, shipment[0]!.tenantId, result.events);

    if (inserted > 0) {
      await db
        .update(shipments)
        .set({
          status: result.currentStatus,
          lastTrackedAt: new Date(),
          trackingRegistered: true,
          updatedAt: new Date(),
        })
        .where(eq(shipments.id, shipment[0]!.id));

      // Trigger notifications for new events
      notifyTrackingEvents(shipment[0]!.id, shipment[0]!.tenantId, result.events, result.currentStatus);
      emitToTenant(shipment[0]!.tenantId, 'dashboard:update', {}).catch(() => {});
    }

    return c.json({ received: true, newEvents: inserted });
  } catch (err) {
    console.error(`[webhooks/${providerName}] error:`, err);
    return c.json({ error: 'Internal error' }, 500);
  }
}

app.post('/17track', async (c) => {
  const body = await c.req.json();
  const signature = c.req.header('x-event-signature') ?? null;
  return handleWebhook('17track', body, signature, c);
});

app.post('/trackingmore', async (c) => {
  const body = await c.req.json();
  const signature = c.req.header('x-webhook-signature') ?? null;
  return handleWebhook('trackingmore', body, signature, c);
});

export default app;
