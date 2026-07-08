import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Mock the DB with dynamic chain builders
vi.mock('../db', () => {
  const mockDb: Record<string, ReturnType<typeof vi.fn>> = {};
  const db = {
    select: vi.fn(() => {
      const limitFn = vi.fn();
      const whereFn = vi.fn(() => ({ limit: limitFn }));
      const fromFn = vi.fn(() => ({ where: whereFn }));
      return { from: fromFn };
    }),
    update: vi.fn(() => {
      const whereFn = vi.fn();
      const setFn = vi.fn(() => ({ where: whereFn, returning: vi.fn() }));
      return { set: setFn };
    }),
    insert: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
  };
  mockDb._db = db;
  return { db };
});

vi.mock('../cache', () => ({
  cacheDel: vi.fn().mockResolvedValue(undefined),
  cacheDelPattern: vi.fn().mockResolvedValue(undefined),
  withCache: vi.fn((_t, _k, fn) => fn()),
}));

vi.mock('../realtime', () => ({ emitToTenant: vi.fn() }));
vi.mock('../services/audit', () => ({ logAudit: vi.fn() }));
vi.mock('../services/shipment', () => ({ createShipment: vi.fn() }));
vi.mock('../shipment-providers', () => ({ getProvider: vi.fn() }));
vi.mock('../shipment-providers/dedup', () => ({ insertEvents: vi.fn() }));
vi.mock('../notifications/service', () => ({ notifyTrackingEvents: vi.fn() }));
vi.mock('../notifications/event-map', () => ({ statusToEventType: vi.fn() }));
vi.mock('../queues', () => ({ notificationQueue: { add: vi.fn() } }));

import shipments from './shipments';

function createTestApp(user?: Record<string, unknown>) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    if (user) {
      c.set('user', user);
      if (user.tenantId) c.set('tenantId', user.tenantId);
    }
    return next();
  });
  app.route('/api/shipments', shipments);
  return app;
}

function mockFoundShipment(id = 's1', trackingNo = 'TN001') {
  const { db } = (vi as any).mocked({} as any) as { db: any };
  // We need to access the inner fns via the getModule mock helper
  // Instead, rebuild via the direct mock import
  const limitFn = vi.fn().mockResolvedValue([{ id, trackingNo, archivedAt: null }]);
  const whereFn = vi.fn(() => ({ limit: limitFn }));
  const fromFn = vi.fn(() => ({ where: whereFn }));
  const returningFn = vi.fn().mockResolvedValue([{ id, trackingNo, archivedAt: null, updatedAt: new Date() }]);
  const updateWhereFn = vi.fn().mockResolvedValue(undefined);
  const setFn = vi.fn(() => ({ where: updateWhereFn, returning: returningFn }));

  const dbModule = vi.mocked(require('../db'));
  const origSelect = dbModule.db.select as ReturnType<typeof vi.fn>;
  origSelect.mockReturnValue({ from: fromFn });

  const origUpdate = dbModule.db.update as ReturnType<typeof vi.fn>;
  origUpdate.mockReturnValue({ set: setFn });
}

describe('DELETE /api/shipments/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    const app = createTestApp();
    const res = await app.request('/api/shipments/some-id', { method: 'DELETE' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for staff role', async () => {
    const app = createTestApp({ id: 'u1', role: 'staff', tenantId: 't1' });
    const res = await app.request('/api/shipments/some-id', {
      method: 'DELETE',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
    });
    expect(res.status).toBe(403);
  });

  it('returns 404 when shipment not found by select query', async () => {
    const { db } = vi.mocked(await import('../db'));
    const limitFn = vi.fn().mockResolvedValue([]);
    const whereFn = vi.fn(() => ({ limit: limitFn }));
    const fromFn = vi.fn(() => ({ where: whereFn }));
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn });

    const app = createTestApp({ id: 'u1', role: 'superadmin' });
    const res = await app.request('/api/shipments/nonexistent', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('not found');
  });

  it('returns 200 for superadmin (found shipment)', async () => {
    const { db } = vi.mocked(await import('../db'));
    const limitFn = vi.fn().mockResolvedValue([{ id: 's1', trackingNo: 'TN001', archivedAt: null }]);
    const whereFn = vi.fn(() => ({ limit: limitFn }));
    const fromFn = vi.fn(() => ({ where: whereFn }));
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn });

    const returningFn = vi.fn().mockResolvedValue([{ id: 's1', trackingNo: 'TN001', archivedAt: null, updatedAt: new Date() }]);
    const updateWhereFn = vi.fn(() => ({ returning: returningFn }));
    const setFn = vi.fn(() => ({ where: updateWhereFn }));
    (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: setFn });

    const app = createTestApp({ id: 'u1', role: 'superadmin' });
    const res = await app.request('/api/shipments/s1', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveProperty('id', 's1');
  });

  it('returns 404 when tenant scope does not match', async () => {
    const { db } = vi.mocked(await import('../db'));
    const limitFn = vi.fn().mockResolvedValue([]);
    const whereFn = vi.fn(() => ({ limit: limitFn }));
    const fromFn = vi.fn(() => ({ where: whereFn }));
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn });

    const app = createTestApp({ id: 'u1', role: 'tenant-admin', tenantId: 'wrong-tenant' });
    const res = await app.request('/api/shipments/s1', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(404);
  });
});
