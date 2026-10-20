import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db', () => {
  const limitFn = vi.fn();
  const whereFn = vi.fn(() => ({ limit: limitFn, orderBy: vi.fn(() => ({ limit: limitFn })) }));
  const fromFn = vi.fn(() => ({ where: whereFn }));
  return {
    db: {
      select: vi.fn(() => ({ from: fromFn })),
    },
  };
});

import { db } from '../db';
import { resolveShipmentId } from './shipment-resolve';

function mockSelect(limitFn: ReturnType<typeof vi.fn>) {
  const whereFn = vi.fn(() => ({ limit: limitFn, orderBy: vi.fn(() => ({ limit: limitFn })) }));
  const fromFn = vi.fn(() => ({ where: whereFn }));
  vi.mocked(db.select).mockReturnValue({ from: fromFn } as never);
  return whereFn;
}

describe('resolveShipmentId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves a tracking number to the active shipment first', async () => {
    const limitFn = vi.fn().mockResolvedValue([{ id: 'uuid-123' }]);
    const whereFn = mockSelect(limitFn);

    const id = await resolveShipmentId('GT175001002', { tenantId: 'tenant-1' });

    expect(id).toBe('uuid-123');
    // The archived fallback must not run when an active row matched.
    expect(whereFn).toHaveBeenCalledOnce();
  });

  it('falls back to the newest archived row when no active shipment exists', async () => {
    const limitFn = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'archived-1' }]);
    const whereFn = mockSelect(limitFn);

    const id = await resolveShipmentId('GT175001002', { tenantId: 'tenant-1' });

    expect(id).toBe('archived-1');
    expect(whereFn).toHaveBeenCalledTimes(2);
  });

  it('resolves by UUID when param is a uuid', async () => {
    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const limitFn = vi.fn().mockResolvedValue([{ id: uuid }]);
    mockSelect(limitFn);

    const id = await resolveShipmentId(uuid, { tenantId: 'tenant-1' });

    expect(id).toBe(uuid);
  });

  it('returns null when no shipment matches', async () => {
    const limitFn = vi.fn().mockResolvedValue([]);
    mockSelect(limitFn);

    const id = await resolveShipmentId('GT175001002', { tenantId: 'tenant-1' });

    expect(id).toBeNull();
  });
});
