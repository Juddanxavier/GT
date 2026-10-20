import type { Queue } from 'bullmq';
import { describe, expect, it, vi } from 'vitest';
import type { Logger } from '../logger';
import { enqueueJob } from './enqueue';

function fakeQueue(add: Queue['add']): Queue {
  return { name: 'test-queue', add } as unknown as Queue;
}

function fakeLogger() {
  return {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  } as unknown as Logger;
}

describe('enqueueJob', () => {
  it('returns true when the job is added', async () => {
    const add = vi.fn().mockResolvedValue({ id: '1' });
    const log = fakeLogger();

    await expect(enqueueJob(fakeQueue(add), 'track', { id: 'x' }, log, 50)).resolves.toBe(true);
    expect(add).toHaveBeenCalledWith('track', { id: 'x' });
    expect(log.error).not.toHaveBeenCalled();
  });

  it('returns false and logs instead of hanging when add never resolves', async () => {
    const add = vi.fn().mockImplementation(() => new Promise(() => {}));
    const log = fakeLogger();

    await expect(enqueueJob(fakeQueue(add), 'track', { id: 'x' }, log, 20)).resolves.toBe(false);
    expect(log.error).toHaveBeenCalledTimes(1);
  });

  it('returns false and logs when add rejects', async () => {
    const add = vi.fn().mockRejectedValue(new Error('connection lost'));
    const log = fakeLogger();

    await expect(enqueueJob(fakeQueue(add), 'invoice', { id: 'x' }, log, 50)).resolves.toBe(false);
    expect(log.error).toHaveBeenCalledTimes(1);
  });

  it('returns false when no queue is configured', async () => {
    const log = fakeLogger();
    await expect(enqueueJob(null, 'track', { id: 'x' }, log)).resolves.toBe(false);
  });
});
