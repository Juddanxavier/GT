import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Worker logging guard (spec 0001, AC-3) ──
// The createWorker wrapper binds jobId + queue before it starts work and
// passes the child into the processor; the failed handler rebuilds the same
// child from job?.id (queue alone when there is no job) and puts jobId into
// the DLQ payload; ready/error bind queue alone; the start line never dumps
// job.data.

const lines = vi.hoisted(() => [] as string[]);

vi.mock('../logger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../logger')>();
  const sink = {
    write: (chunk: string) => {
      lines.push(chunk);
    },
  };
  const testLogger = actual.createLogger({ level: 'info', destination: sink });
  return {
    ...actual,
    logger: testLogger,
    childLogger: (bindings: Record<string, unknown>) => testLogger.child(bindings),
  };
});

type WorkerEntry = {
  processor: (job: { id?: string; data: unknown }) => Promise<unknown>;
  handlers: Record<string, (...args: unknown[]) => unknown>;
};

const registry = vi.hoisted(() => new Map<string, WorkerEntry>());

vi.mock('bullmq', () => ({
  Worker: class MockWorker {
    private readonly queueName: string;
    constructor(
      queueName: string,
      processor: (job: { id?: string; data: unknown }) => Promise<unknown>,
    ) {
      this.queueName = queueName;
      registry.set(queueName, { processor, handlers: {} });
    }
    on(event: string, fn: (...args: unknown[]) => unknown) {
      const entry = registry.get(this.queueName);
      if (entry) entry.handlers[event] = fn;
      return this;
    }
    async close() {}
  },
}));

vi.mock('../db', () => ({ db: { execute: vi.fn(), select: vi.fn() } }));
vi.mock('../queues', () => ({
  shipmentQueue: { add: vi.fn().mockResolvedValue(undefined) },
  archiveQueue: null,
  deadLetterQueue: { add: vi.fn().mockResolvedValue(undefined) },
  emailQueue: null,
  notificationQueue: null,
  pdfQueue: null,
  whatsappQueue: null,
  isRedisConnected: vi.fn().mockReturnValue(true),
  isRedisConfigured: vi.fn().mockReturnValue(true),
}));
vi.mock('../redis', () => ({ bullConnectionOptions: {}, bullConnection: null, cacheClient: null }));

import './index';

function parseLines(from: number): Record<string, unknown>[] {
  return lines.slice(from).map((l) => JSON.parse(l) as Record<string, unknown>);
}

describe('worker job logging (AC-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('binds jobId and queue on the start line and the work line, and never dumps job.data', async () => {
    const entry = registry.get('shipment');
    expect(entry).toBeDefined();

    const before = lines.length;
    await entry!.processor({
      id: 'job-abc-123',
      data: { type: 'bogus-type', customerEmail: 'leak@example.com' },
    });
    const produced = parseLines(before);

    const start = produced.filter((l) => l.msg === 'processing job');
    expect(start).toHaveLength(1);
    expect(start[0]?.jobId).toBe('job-abc-123');
    expect(start[0]?.queue).toBe('shipment');
    expect(start[0]?.level).toBe(30);

    const work = produced.filter((l) => l.msg === 'unknown shipment job type');
    expect(work).toHaveLength(1);
    expect(work[0]?.jobId).toBe('job-abc-123');
    expect(work[0]?.queue).toBe('shipment');
    expect(work[0]?.level).toBe(40);

    // Grepping one job id finds start and work, and no payload leaked: the
    // customer email never appears raw or in masked form anywhere.
    expect(produced.filter((l) => l.jobId === 'job-abc-123')).toHaveLength(2);
    expect(lines.slice(before).join('')).not.toContain('example.com');
  });

  it('rebuilds the child in the failed handler and puts jobId into the DLQ payload', async () => {
    const entry = registry.get('shipment');
    expect(entry).toBeDefined();
    const { deadLetterQueue } = await import('../queues');

    const before = lines.length;
    await entry!.handlers.failed?.({ id: 'job-fail-9', data: { type: 'track' } }, new Error('boom'));
    const produced = parseLines(before);

    const failed = produced.filter((l) => l.msg === 'job failed');
    expect(failed).toHaveLength(1);
    expect(failed[0]?.jobId).toBe('job-fail-9');
    expect(failed[0]?.queue).toBe('shipment');
    expect(failed[0]?.level).toBe(50);
    expect((failed[0]?.err as { message?: string })?.message).toBe('boom');

    expect(deadLetterQueue?.add).toHaveBeenCalledWith(
      'shipment',
      expect.objectContaining({
        jobId: 'job-fail-9',
        queueName: 'shipment',
        failedReason: 'boom',
      }),
    );

    // No job in hand → queue alone, no jobId.
    const orphanBefore = lines.length;
    await entry!.handlers.failed?.(undefined, new Error('no job'));
    const orphan = parseLines(orphanBefore).filter((l) => l.msg === 'job failed');
    expect(orphan).toHaveLength(1);
    expect(orphan[0]?.queue).toBe('shipment');
    expect(orphan[0]?.jobId).toBeUndefined();
  });

  it('binds queue alone on ready and error', async () => {
    const entry = registry.get('shipment');
    expect(entry).toBeDefined();

    const before = lines.length;
    entry!.handlers.ready?.();
    entry!.handlers.error?.(new Error('conn lost'));
    const produced = parseLines(before);

    const ready = produced.filter((l) => l.msg === 'worker ready');
    expect(ready).toHaveLength(1);
    expect(ready[0]?.queue).toBe('shipment');
    expect(ready[0]?.jobId).toBeUndefined();

    const errored = produced.filter((l) => l.msg === 'worker error');
    expect(errored).toHaveLength(1);
    expect(errored[0]?.queue).toBe('shipment');
    expect(errored[0]?.jobId).toBeUndefined();
    expect((errored[0]?.err as { message?: string })?.message).toBe('conn lost');
  });
});
