import * as Sentry from '@sentry/hono/node';
import { type ConnectionOptions, Worker } from 'bullmq';
import { isRedisConnected } from '../queues';
import { bullConnectionOptions } from '../redis';

export function startDlqMonitor(): void {
  if (!isRedisConnected() || !bullConnectionOptions) return;

  const worker = new Worker(
    'dead-letter',
    async (job) => {
      const msg = `[DLQ] Job ${job.name} (${job.id}) failed after retries`;
      console.error(msg);
      Sentry.captureException(new Error(msg), {
        tags: {
          'dlq.jobName': job.name,
          'dlq.originalQueue': job.data?.queueName ?? 'unknown',
          'dlq.failedReason': job.failedReason ?? 'unknown',
        },
      });
    },
    { connection: bullConnectionOptions as ConnectionOptions, concurrency: 1 },
  );

  worker.on('completed', (job) => {
    console.error(`[DLQ] Job ${job?.id} moved to dead letter queue and reported to Sentry`);
  });

  worker.on('error', (err) => {
    console.error('[DLQ] Monitor error:', err.message);
  });

  console.log('[DLQ] Monitor started');
}
