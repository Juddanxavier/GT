import { Queue, type ConnectionOptions, type JobsOptions } from 'bullmq';
import { bullConnectionOptions } from '../redis';

let connected = false;

function createOrSkip(name: string, opts?: Partial<QueueOptions>): Queue | null {
  if (!bullConnectionOptions) {
    return null;
  }
  connected = true;
  return new Queue(name, { connection: bullConnectionOptions as ConnectionOptions, ...opts });
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
  deadLetterQueue,
]
  .filter((q): q is Queue => q !== null);

export type QueueName = string;

export function isRedisConnected(): boolean {
  return connected;
}

export async function closeQueues(): Promise<void> {
  await Promise.all(queues.map((q) => q.close()));
}
