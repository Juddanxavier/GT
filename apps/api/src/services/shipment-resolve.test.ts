import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db', () => {
  const limitFn = vi.fn();
  const whereFn = vi.fn(() => ({ limit: limitFn }));
  const fromFn = vi.fn(() => ({ where: whereFn }));
  return {
    db: {
      select: vi.fn(() => ({ from: fromFn })),
    },
  };
});

import { db } from '../db';
import { resolveShipmentId } from './shipment-resolve';

describe('resolveShipmentId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('looks up tracking numbers without comparing against the uuid column', async () => {
    const limitFn = vi.fn().mockResolvedValue([{ id: 'uuid-123' }]);
    const whereFn = vi.fn(() => ({ limit: limitFn }));
    const fromFn = vi.fn(() => ({ where: whereFn }));
    vi.mocked(db.select).mockReturnValue({ from: fromFn } as never);

    const id = await resolveShipmentId('GT175001002', { tenantId: 'tenant-1' });

    expect(id).toBe('uuid-123');
    expect(whereFn).toHaveBeenCalledOnce();
  });

  it('resolves by UUID when param is a uuid', async () => {
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const limitFn = vi.fn().mockResolvedValue([{ id: uuid }]);
    const whereFn = vi.fn(() => ({ limit: limitFn }));
    const fromFn = vi.fn(() => ({ where: whereFn }));
    vi.mocked(db.select).mockReturnValue({ from: fromFn } as never);

    const id = await resolveShipmentId(uuid, { tenantId: 'tenant-1' });

    expect(id).toBe(uuid);
  });

  it('returns null when no shipment matches', async () => {
    const limitFn = vi.fn().mockResolvedValue([]);
    const whereFn = vi.fn(() => ({ limit: limitFn }));
    const fromFn = vi.fn(() => ({ where: whereFn }));
    vi.mocked(db.select).mockReturnValue({ from: fromFn } as never);

    const id = await resolveShipmentId('GT175001002', { tenantId: 'tenant-1' });

    expect(id).toBeNull();
  });
});
