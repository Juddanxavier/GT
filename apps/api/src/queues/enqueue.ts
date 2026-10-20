import type { Queue } from 'bullmq';
import type { Logger } from '../logger';

const DEFAULT_TIMEOUT_MS = 3000;

/**
 * Add a job without letting an unreachable Redis stall the caller.
 *
 * BullMQ only resolves `queue.add()` once its connection emits 'ready', and
 * ioredis keeps retrying forever (`maxRetriesPerRequest: null`). Shipment
 * routes call this inside the request transaction, so an unresolved add() used
 * to hang the request until the 60s timeout and delay the commit.
 *
 * Returns false when the job was not queued. Callers must treat that as
 * "retry later, do not fail the request" - the 2-hourly retrack sweep picks up
 * shipments that were never tracked.
 */
export async function enqueueJob(
  queue: Queue | null,
  name: string,
  data: Record<string, unknown>,
  log: Logger,
  timeoutMs = Number(process.env.ENQUEUE_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
): Promise<boolean> {
  if (!queue) return false;

  // A late rejection (after the timeout below) must not crash the process.
  const add = queue.add(name, data);
  add.catch(() => {});

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      add,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`queue.add timed out after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
    return true;
  } catch (err) {
    log.error({ err, queue: queue.name, job: name }, 'failed to enqueue job');
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
