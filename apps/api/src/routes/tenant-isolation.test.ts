import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// ── Mocks ──

const chainable = vi.hoisted(() => {
  const q = { from: vi.fn(() => q), where: vi.fn(() => q), limit: vi.fn(() => q), orderBy: vi.fn(() => q), offset: vi.fn(() => q), then: undefined as unknown };
  q.then = vi.fn((resolve: (v: unknown) => unknown) => resolve([]));
  return q;
});
const mockDb = vi.hoisted(() => ({
  select: vi.fn(() => chainable),
  insert: vi.fn(() => chainable),
  update: vi.fn(() => chainable),
  delete: vi.fn(() => chainable),
  execute: vi.fn(async () => [] as never[]),
}));
vi.mock('../db', () => ({ db: mockDb, default: mockDb, runWithTenantContext: vi.fn(async (_id: string | null, fn: () => unknown) => fn()) }));

const capturedKeys: string[] = [];
const mockCache = vi.hoisted(() => ({
  cacheDel: vi.fn(),
  cacheDelPattern: vi.fn(),
  withCache: vi.fn((_t: unknown, k: unknown, fn: () => unknown) => {
    capturedKeys.push(k as string);
    return fn();
  }),
}));
vi.mock('../cache', () => mockCache);

vi.mock('../redis', () => ({ cacheClient: null, connectRedis: vi.fn(), disconnectRedis: vi.fn(), bullConnectionOptions: null, bullConnection: null }));
vi.mock('../realtime', () => ({ emitToTenant: vi.fn() }));
vi.mock('../services/audit', () => ({ logAudit: vi.fn() }));
vi.mock('../email/provider', () => ({ sendEmail: vi.fn(), getEmailProviderStatus: vi.fn(() => ({ configured: false })), closeTransport: vi.fn() }));
vi.mock('../auth-api', () => ({ createUser: vi.fn(async () => ({ user: { id: 'new-user' } })) }));
vi.mock('../queues', () => ({ notificationQueue: null }));
vi.mock('../notifications/event-map', () => ({ statusToEventType: vi.fn(() => 'status_changed') }));
vi.mock('../services/otp', () => ({ generateOtp: vi.fn(() => '123456'), verifyOtp: vi.fn(() => true), maskEmail: vi.fn((e: string) => e!.substring(0, 3) + '***') }));

import publicTrack from './public-track';
import claimShipment from './claim-shipment';

// ── Helpers ──

function mount<E extends Hono<any, any, any>>(route: E, prefix: string, tenantId?: string | null) {
  const app = new Hono<{ Variables: { tenantId?: string } }>();
  app.use('*', async (c, next) => {
    if (tenantId) c.set('tenantId', tenantId);
    return next();
  });
  app.route(prefix, route);
  return app;
}

// eq()/and() build SQL fragments; walk .config.sql recursively looking for a
// column reference so we can assert a tenantId filter was (or wasn't) added.
// eq()/and() build SQL fragments; walk the rendered chunks for a column
// reference. Skip the column's `.table` back-reference (which contains every
// column of the table) so only the columns actually used in the filter match.
function sqlContains(arg: unknown, text: string): boolean {
  const seen = new WeakSet<object>();
  const walk = (v: unknown): boolean => {
    if (typeof v === 'string') return v.includes(text);
    if (Array.isArray(v)) return v.some(walk);
    if (v && typeof v === 'object') {
      if (seen.has(v as object)) return false;
      seen.add(v as object);
      const obj = v as Record<string, unknown>;
      return Object.entries(obj).some(
        ([k, val]) => (k === 'table' ? false : k.includes(text) || walk(val)),
      );
    }
    return false;
  };
  return walk(arg);
}

function shipSelect(rows: unknown[]) {
  const limitFn = vi.fn().mockResolvedValue(rows);
  const orderByFn = vi.fn().mockResolvedValue(rows);
  const whereFn = vi.fn((_cond: unknown) => ({ limit: limitFn, orderBy: orderByFn }));
  const fromFn = vi.fn(() => ({ where: whereFn }));
  (mockDb.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn });
  return whereFn;
}

describe('tenant isolation: public tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedKeys.length = 0;
    (mockDb.select as ReturnType<typeof vi.fn>).mockReturnValue(chainable);
  });

  it('scopes to the domain-resolved tenant', async () => {
    const whereFn = shipSelect([{ id: 's1', trackingNo: 'TN123', status: 'in_transit', carrier: 'dhl', origin: 'Mumbai', destination: 'Delhi', tenantId: 't1' }]);
    const app = mount(publicTrack, '/api/track', 't1');
    const res = await app.request('/api/track/TN123', { headers: { host: 'gajantraders.com' } });
    expect(res.status).toBe(200);
    // Cache key includes the tenant scope
    expect(capturedKeys).toContain('public:track:TN123:t1');
    // Shipment query has a tenantId filter
    expect(sqlContains(whereFn.mock.calls[0]![0], 'tenant_id')).toBe(true);
  });

  it('falls back to a global lookup with no tenant context (localhost dev)', async () => {
    const whereFn = shipSelect([{ id: 's1', trackingNo: 'TN123', status: 'in_transit', carrier: 'dhl', origin: 'Mumbai', destination: 'Delhi', tenantId: 't1' }]);
    const app = mount(publicTrack, '/api/track');
    const res = await app.request('/api/track/TN123', { headers: { host: 'localhost:3001' } });
    expect(res.status).toBe(200);
    expect(capturedKeys).toContain('public:track:TN123:');
    expect(sqlContains(whereFn.mock.calls[0]![0], 'tenant_id')).toBe(false);
  });

  it('honors an explicit ?tenant= slug over the resolved domain', async () => {
    // First select: slug->tenant lookup. Second select: shipment lookup (empty).
    (mockDb.select as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 'other-tenant' }]) })) })) })
      .mockReturnValue({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })) });

    const app = mount(publicTrack, '/api/track', 't1');
    const res = await app.request('/api/track/TN123?tenant=lanka', { headers: { host: 'gajantraders.com' } });
    expect(res.status).toBe(404); // no shipment in the slug tenant
    expect(capturedKeys).toContain('public:track:TN123:other-tenant');
  });
});

describe('tenant isolation: claim OTP flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockDb.select as ReturnType<typeof vi.fn>).mockReturnValue(chainable);
  });

  it('scopes /claim/init lookup to the resolved tenant', async () => {
    const whereFn = shipSelect([{ id: 's1', trackingNo: 'TN123', contactEmail: 'a@b.c', userId: null, tenantId: 't1' }]);
    const app = mount(claimShipment, '/api/track', 't1');
    const res = await app.request('/api/track/claim/init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ trackingNo: 'TN123' }),
    });
    expect(res.status).toBe(200);
    expect(sqlContains(whereFn.mock.calls[0]![0], 'tenant_id')).toBe(true);
  });

  it('does not leak a shipment from another tenant during /claim/init', async () => {
    // Shipment belongs to t2, requester resolved to t1 -> 404 (no cross-tenant read)
    const whereFn = shipSelect([]);
    const app = mount(claimShipment, '/api/track', 't1');
    const res = await app.request('/api/track/claim/init', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ trackingNo: 'TN999' }),
    });
    expect(res.status).toBe(404);
    expect(sqlContains(whereFn.mock.calls[0]![0], 'tenant_id')).toBe(true);
  });
});
