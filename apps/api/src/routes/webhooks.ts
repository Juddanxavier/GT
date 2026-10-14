import { Hono } from 'hono';
import type { Context } from 'hono';
import { webhookQueue } from '../queues';
import { getProvider } from '../shipment-providers';

const app = new Hono();

async function handleWebhook(
  providerName: string,
  rawBody: string,
  parsedBody: unknown,
  signature: string | null,
  c: Context,
): Promise<Response> {
  try {
    const provider = getProvider();
    if (provider.name !== providerName) {
      return c.json({ error: `Not the active provider (expected ${provider.name})` }, 400);
    }

    // Verify the HMAC over the raw request body as received — re-serializing
    // the parsed JSON would break the signature if key order/whitespace differs.
    if (!provider.verifyWebhook(rawBody, signature)) {
      return c.json({ error: 'Invalid signature' }, 401);
    }

    // Enqueue raw payload to BullMQ for async processing (D-14)
    // Worker handles: processWebhook() → insertEvents() → notifyTrackingEvents()
    if (webhookQueue) {
      await webhookQueue.add('webhook-event', {
        provider: providerName,
        body: parsedBody,
        signature,
        timestamp: new Date().toISOString(),
      });
    } else {
      c.get('logger').error('webhook event skipped: Redis/BullMQ not available');
      return c.json({ error: 'Queue unavailable' }, 503);
    }

    return c.json({ received: true }, 200);
  } catch (err) {
    c.get('logger').error({ err, provider: providerName }, 'webhook processing failed');
    return c.json({ error: 'Internal error' }, 500);
  }
}

app.post('/17track', async (c) => {
  const rawBody = await c.req.raw.text();
  const body = JSON.parse(rawBody);
  const signature = c.req.header('x-event-signature') ?? null;
  return handleWebhook('17track', rawBody, body, signature, c);
});

app.post('/trackingmore', async (c) => {
  const rawBody = await c.req.raw.text();
  const body = JSON.parse(rawBody);
  const signature = c.req.header('x-webhook-signature') ?? null;
  return handleWebhook('trackingmore', rawBody, body, signature, c);
});

export default app;
