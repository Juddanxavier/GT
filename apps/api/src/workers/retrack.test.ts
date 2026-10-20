import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAdd = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../db', () => ({ db: { execute: vi.fn() } }));
vi.mock('../queues', () => ({
  shipmentQueue: { add: mockAdd },
  archiveQueue: null,
  deadLetterQueue: null,
  emailQueue: null,
  notificationQueue: null,
  pdfQueue: null,
  whatsappQueue: null,
  isRedisConnected: vi.fn().mockReturnValue(true),
  isRedisConfigured: vi.fn().mockReturnValue(true),
}));
vi.mock('../redis', () => ({ bullConnectionOptions: {}, bullConnection: null, cacheClient: null }));
vi.mock('bullmq', () => ({ Worker: function() { return { on: vi.fn(), close: vi.fn() }; } }));

import { retrackActiveShipments, retrackPendingShipments } from './index';
import { db } from '../db';

describe('retrackActiveShipments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries active shipments and enqueues track jobs', async () => {
    const mockRows = [
      { id: 's1', tracking_no: 'TN001', tenant_id: 't1', carrier: 'FedEx', courier_code: 'fedex' },
      { id: 's2', tracking_no: 'TN002', tenant_id: 't1', carrier: 'DHL', courier_code: 'dhl' },
    ];
    vi.mocked(db.execute).mockResolvedValue(mockRows as any);

    const count = await retrackActiveShipments();

    expect(count).toBe(2);
    expect(db.execute).toHaveBeenCalledOnce();
    expect(mockAdd).toHaveBeenCalledTimes(2);
    expect(mockAdd).toHaveBeenCalledWith('track', {
      type: 'track', shipmentId: 's1', tenantId: 't1',
      trackingNo: 'TN001', courierCode: 'fedex', carrier: 'FedEx',
    });
    expect(mockAdd).toHaveBeenCalledWith('track', {
      type: 'track', shipmentId: 's2', tenantId: 't1',
      trackingNo: 'TN002', courierCode: 'dhl', carrier: 'DHL',
    });
  });

  it('returns 0 when no active shipments need tracking', async () => {
    vi.mocked(db.execute).mockResolvedValue([] as any);

    const count = await retrackActiveShipments();

    expect(count).toBe(0);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('handles null carrier/courier_code fields', async () => {
    const mockRows = [
      { id: 's1', tracking_no: 'TN001', tenant_id: 't1', carrier: null, courier_code: null },
    ];
    vi.mocked(db.execute).mockResolvedValue(mockRows as any);

    const count = await retrackActiveShipments();

    expect(count).toBe(1);
    expect(mockAdd).toHaveBeenCalledWith('track', {
      type: 'track', shipmentId: 's1', tenantId: 't1',
      trackingNo: 'TN001', courierCode: null, carrier: null,
    });
  });
});

describe('retrackPendingShipments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enqueues the first track for shipments that were never tracked', async () => {
    const mockRows = [
      { id: 'p1', tracking_no: 'TN100', tenant_id: 't1', carrier: 'FedEx', courier_code: null },
    ];
    vi.mocked(db.execute).mockResolvedValue(mockRows as any);

    const count = await retrackPendingShipments();

    expect(count).toBe(1);
    expect(db.execute).toHaveBeenCalledOnce();
    expect(mockAdd).toHaveBeenCalledWith('track', {
      type: 'track', shipmentId: 'p1', tenantId: 't1',
      trackingNo: 'TN100', courierCode: null, carrier: 'FedEx',
    });
  });

  it('returns 0 when nothing is waiting for a first track', async () => {
    vi.mocked(db.execute).mockResolvedValue([] as any);

    const count = await retrackPendingShipments();

    expect(count).toBe(0);
    expect(mockAdd).not.toHaveBeenCalled();
  });
});
