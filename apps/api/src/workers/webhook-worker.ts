import { eq } from 'drizzle-orm';
import { type ConnectionOptions, Worker } from 'bullmq';
import { db } from '../db';
import { shipments } from '../db/schema';
import { isRedisConnected } from '../queues';
import { bullConnectionOptions } from '../redis';
import { emitToTenant } from '../realtime';
import { getProvider } from '../shipment-providers';
import { insertEvents } from '../shipment-providers/dedup';
import { notifyTrackingEvents } from '../notifications/service';

export const webhookWorker: Worker | null = (() => {
  if (!isRedisConnected()) {
    console.warn('[webhook-worker] Redis not available — worker not started');
    return null;
  }

  const worker = new Worker(
    'webhook-events',
    async (job) => {
      const { provider: providerName, body } = job.data as {
        provider: string;
        body: unknown;
        signature: string | null;
        timestamp: string;
      };

      console.log(`[webhook-worker] processing job ${job.id} from ${providerName}`);

      // Determine and process webhook → get normalized events
      const provider = getProvider();
      if (provider.name !== providerName) {
        throw new Error(`Provider mismatch: active=${provider.name}, job=${providerName}`);
      }

      const result = await provider.processWebhook(body);
      if (!result) {
        throw new Error('Failed to parse webhook payload');
      }

      // Lookup shipment by tracking number
      const [shipment] = await db
        .select({
          id: shipments.id,
          tenantId: shipments.tenantId,
          trackingNo: shipments.trackingNo,
        })
        .from(shipments)
        .where(eq(shipments.trackingNo, result.trackingNo))
        .limit(1);

      if (!shipment) {
        // 17TRACK may send webhook before shipment is created locally
        console.log(`[webhook-worker] shipment not found for tracking ${result.trackingNo} — skipping`);
        return { skipped: 'shipment_not_found', trackingNo: result.trackingNo };
      }

      // Dedup insert events (ON CONFLICT DO NOTHING)
      const inserted = await insertEvents(shipment.id, shipment.tenantId, result.events);

      if (inserted > 0) {
        // Update shipment status
        await db
          .update(shipments)
          .set({
            status: result.currentStatus,
            lastTrackedAt: new Date(),
            trackingRegistered: true,
            updatedAt: new Date(),
          })
          .where(eq(shipments.id, shipment.id));

        // Trigger notifications for new events
        await notifyTrackingEvents(
          shipment.id,
          shipment.tenantId,
          result.events,
          result.currentStatus,
        );

        // Real-time push
        emitToTenant(shipment.tenantId, 'dashboard:update', {});
      }

      return { processed: true, eventsInserted: inserted };
    },
    {
      connection: bullConnectionOptions as ConnectionOptions,
      concurrency: 5,
      maxStalledCount: 3,
    },
  );

  worker.on('ready', () => console.log('[webhook-worker] ready'));
  worker.on('failed', (job, err) => {
    console.error(`[webhook-worker] job ${job?.id} failed:`, err.message);
  });
  worker.on('error', (err) => console.error('[webhook-worker] error:', err.message));

  return worker;
})();

export async function stopWebhookWorker(): Promise<void> {
  await webhookWorker?.close();
}
