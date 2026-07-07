import { Hono } from 'hono';
import { webhookQueue } from '../queues';
import { getProvider } from '../shipment-providers';

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

    // Enqueue raw payload to BullMQ for async processing (D-14)
    // Worker handles: processWebhook() → insertEvents() → notifyTrackingEvents()
    if (webhookQueue) {
      await webhookQueue.add('webhook-event', {
        provider: providerName,
        body,
        signature,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error('[webhooks] Redis/BullMQ not available — webhook event SKIPPED');
      return c.json({ error: 'Queue unavailable' }, 503);
    }

    return c.json({ received: true }, 200);
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
