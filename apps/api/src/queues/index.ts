import { Queue, type ConnectionOptions, type JobsOptions } from 'bullmq';
import { bullConnection, bullProducerConnectionOptions } from '../redis';

function createOrSkip(name: string, opts?: Partial<QueueOptions>): Queue | null {
  if (!bullProducerConnectionOptions) {
    return null;
  }
  return new Queue(name, {
    connection: bullProducerConnectionOptions as ConnectionOptions,
    ...opts,
  });
}

type QueueOptions = { defaultJobOptions: JobsOptions };

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { age: 3600, count: 100 },
  removeOnFail: { age: 86400, count: 500 },
};

const sharedOpts = { defaultJobOptions };

export const notificationQueue = createOrSkip('notification', sharedOpts);
export const emailQueue = createOrSkip('email', sharedOpts);
export const pdfQueue = createOrSkip('pdf', sharedOpts);
export const whatsappQueue = createOrSkip('whatsapp', sharedOpts);

const archiveOpts: QueueOptions = {
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 86400 * 7, count: 50 },
    removeOnFail: { age: 86400 * 30, count: 100 },
  },
};
export const archiveQueue = createOrSkip('archive', archiveOpts);

const shipmentOpts: QueueOptions = {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600, count: 100 },
    removeOnFail: { age: 86400, count: 500 },
  },
};
export const shipmentQueue = createOrSkip('shipment', shipmentOpts);

const webhookOpts: QueueOptions = {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600 * 24 * 7, count: 1000 },
    removeOnFail: { age: 3600 * 24 * 30, count: 500 },
  },
};
export const webhookQueue = createOrSkip('webhook-events', webhookOpts);

export const deadLetterQueue = createOrSkip('dead-letter', {
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { age: 86400 * 30, count: 1000 },
    removeOnFail: { age: 86400 * 30, count: 1000 },
  },
});

export const queues = [
  notificationQueue,
  emailQueue,
  pdfQueue,
  whatsappQueue,
  archiveQueue,
  shipmentQueue,
  webhookQueue,
  deadLetterQueue,
]
  .filter((q): q is Queue => q !== null);

export type QueueName = string;

export function isRedisConfigured(): boolean {
  return !!bullProducerConnectionOptions;
}

/**
 * True only when the shared Redis connection is actually established.
 * `REDIS_URL` being present is not the same as Redis being reachable — do not
 * report readiness off the env var alone.
 */
export function isRedisConnected(): boolean {
  return bullConnection?.status === 'ready';
}

export async function closeQueues(): Promise<void> {
  await Promise.all(queues.map((q) => q.close()));
}
