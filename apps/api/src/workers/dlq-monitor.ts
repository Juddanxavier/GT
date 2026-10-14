import * as Sentry from '@sentry/hono/node';
import { type ConnectionOptions, Worker } from 'bullmq';
import { childLogger } from '../logger';
import { isRedisConnected } from '../queues';
import { bullConnectionOptions } from '../redis';

const QUEUE = 'dead-letter';

export function startDlqMonitor(): void {
  if (!isRedisConnected() || !bullConnectionOptions) return;

  const worker = new Worker(
    QUEUE,
    async (job) => {
      const log = childLogger({ queue: QUEUE, jobId: job.id });
      const msg = `Job ${job.name} (${job.id}) failed after retries`;
      log.error({ jobName: job.name }, 'job failed after retries, reported to Sentry');
      Sentry.captureException(new Error(msg), {
        tags: {
          'dlq.jobName': job.name,
          'dlq.originalQueue': job.data?.queueName ?? 'unknown',
          'dlq.failedReason': job.failedReason ?? 'unknown',
          jobId: job.data?.jobId ?? job.id,
        },
      });
    },
    { connection: bullConnectionOptions as ConnectionOptions, concurrency: 1 },
  );

  worker.on('completed', (job) => {
    childLogger({ queue: QUEUE, ...(job?.id ? { jobId: job.id } : {}) }).error(
      'job moved to dead letter queue and reported to Sentry',
    );
  });

  worker.on('error', (err) => {
    childLogger({ queue: QUEUE }).error({ err }, 'dlq monitor error');
  });

  childLogger({ queue: QUEUE }).info('dlq monitor started');
}
