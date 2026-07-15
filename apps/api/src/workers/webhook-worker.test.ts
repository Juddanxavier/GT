import { describe, it, expect, vi, beforeEach } from 'vitest';

type Processor = (job: { id: string; data: Record<string, unknown> }) => Promise<unknown>;

const processorRef = vi.hoisted(() => ({ current: null as Processor | null }));

vi.mock('bullmq', () => ({
  Worker: function MockWorker(_queue: string, processor: Processor) {
    processorRef.current = processor;
    return { on: vi.fn().mockReturnThis(), close: vi.fn() };
  },
}));

const mockDbChain = vi.hoisted(() => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.set = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.then = vi.fn();
  return chain;
});

const mockDb = vi.hoisted(() => ({
  select: vi.fn(() => mockDbChain),
  update: vi.fn(() => mockDbChain),
  execute: vi.fn(),
}));

const mockProcessWebhook = vi.hoisted(() => vi.fn());
const mockInsertEvents = vi.hoisted(() => vi.fn());
const mockNotifyTrackingEvents = vi.hoisted(() => vi.fn());
const mockEmitToTenant = vi.hoisted(() => vi.fn());

vi.mock('../db', () => ({ db: mockDb }));
vi.mock('../queues', () => ({ isRedisConnected: vi.fn().mockReturnValue(true) }));
vi.mock('../redis', () => ({ bullConnectionOptions: {} }));
vi.mock('../realtime', () => ({ emitToTenant: mockEmitToTenant }));
vi.mock('../shipment-providers', () => ({
  getProvider: vi.fn(() => ({
    name: '17track',
    processWebhook: mockProcessWebhook,
  })),
}));
vi.mock('../shipment-providers/dedup', () => ({ insertEvents: mockInsertEvents }));
vi.mock('../notifications/service', () => ({ notifyTrackingEvents: mockNotifyTrackingEvents }));

import './webhook-worker';

describe('webhookWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const job = (data: Record<string, unknown>) => ({ id: 'test-job', data });

  function mockShipmentLookup(shipment: unknown) {
    mockDbChain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(shipment ? [shipment] : []));
  }

  it('processes webhook and inserts events for known shipment', async () => {
    mockShipmentLookup({ id: 's1', tenantId: 't1', trackingNo: 'TN001' });
    mockProcessWebhook.mockResolvedValue({
      trackingNo: 'TN001',
      currentStatus: 'in_transit',
      events: [{ date: '2026-07-15', location: 'Mumbai', status: 'In Transit' }],
    });
    mockInsertEvents.mockResolvedValue(2);

    const result = await processorRef.current!(
      job({ provider: '17track', body: { some: 'data' }, signature: null, timestamp: '2026-07-15T12:00:00Z' }),
    );

    expect(result).toEqual({ processed: true, eventsInserted: 2 });
    expect(mockProcessWebhook).toHaveBeenCalledWith({ some: 'data' });
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockNotifyTrackingEvents).toHaveBeenCalledWith('s1', 't1', expect.any(Array), 'in_transit');
    expect(mockEmitToTenant).toHaveBeenCalledWith('t1', 'dashboard:update', {});
  });

  it('skips when shipment not found', async () => {
    mockShipmentLookup(null);
    mockProcessWebhook.mockResolvedValue({
      trackingNo: 'TN999',
      currentStatus: 'in_transit',
      events: [],
    });

    const result = await processorRef.current!(
      job({ provider: '17track', body: {}, signature: null, timestamp: '2026-07-15T12:00:00Z' }),
    );

    expect(result).toEqual({ skipped: 'shipment_not_found', trackingNo: 'TN999' });
    expect(mockInsertEvents).not.toHaveBeenCalled();
    expect(mockNotifyTrackingEvents).not.toHaveBeenCalled();
  });

  it('throws on provider mismatch', async () => {
    await expect(
      processorRef.current!(job({ provider: 'trackingmore', body: {}, signature: null, timestamp: '' })),
    ).rejects.toThrow('Provider mismatch');
  });

  it('throws on unparseable webhook body', async () => {
    mockProcessWebhook.mockResolvedValue(null);

    await expect(
      processorRef.current!(job({ provider: '17track', body: {}, signature: null, timestamp: '' })),
    ).rejects.toThrow('Failed to parse webhook payload');
  });

  it('skips update and notification when no new events', async () => {
    mockShipmentLookup({ id: 's1', tenantId: 't1', trackingNo: 'TN001' });
    mockProcessWebhook.mockResolvedValue({
      trackingNo: 'TN001',
      currentStatus: 'delivered',
      events: [{ date: '2026-07-15', location: 'Delhi', status: 'Delivered' }],
    });
    mockInsertEvents.mockResolvedValue(0);

    const result = await processorRef.current!(
      job({ provider: '17track', body: {}, signature: null, timestamp: '' }),
    );

    expect(result).toEqual({ processed: true, eventsInserted: 0 });
    expect(mockDb.update).not.toHaveBeenCalled();
    expect(mockNotifyTrackingEvents).not.toHaveBeenCalled();
    expect(mockEmitToTenant).not.toHaveBeenCalled();
  });
});
