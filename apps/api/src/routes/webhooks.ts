import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../db';
import { shipments } from '../db/schema';
import { checkWebhookIdempotency } from '../notifications/idempotency';
import { notifyTrackingEvents } from '../notifications/service';
import { emitToTenant } from '../realtime';
import { getProvider } from '../shipment-providers';
import { insertEvents } from '../shipment-providers/dedup';

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

    // Idempotency: check if this exact webhook payload was already processed
    const alreadySeen = await checkWebhookIdempotency(rawBody);
    if (alreadySeen) {
      return c.json({ received: true, duplicate: true });
    }

    // Parse events directly from the webhook payload — no API call to the provider.
    const result = await provider.processWebhook(body);
    if (!result) {
      return c.json({ error: 'Failed to parse webhook payload' }, 400);
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
      .where(eq(shipments.trackingNo, result.trackingNo))
      .limit(1);

    if (!shipment.length) {
      return c.json({ error: 'Unknown tracking number' }, 404);
    }

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
      notifyTrackingEvents(
        shipment[0]!.id,
        shipment[0]!.tenantId,
        result.events,
        result.currentStatus,
      );
      emitToTenant(shipment[0]!.tenantId, 'dashboard:update', {});
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
