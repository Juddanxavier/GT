import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

const chainable = vi.hoisted(() => {
  const q = { from: vi.fn(() => q), where: vi.fn(() => q), limit: vi.fn(() => q), orderBy: vi.fn(() => q), returning: vi.fn(() => q), then: undefined as unknown };
  q.then = vi.fn((resolve: (v: unknown) => unknown) => resolve([]));
  return q;
});
const mockDb = vi.hoisted(() => ({
  select: vi.fn(() => chainable),
  insert: vi.fn(() => chainable),
  update: vi.fn(() => chainable),
  delete: vi.fn(() => chainable),
}));
vi.mock('../db', () => ({ db: mockDb }));

vi.mock('../cache', () => ({ cacheDel: vi.fn(), cacheDelPattern: vi.fn(), withCache: vi.fn((_t: unknown, _k: unknown, fn: () => unknown) => fn()) }));
vi.mock('../realtime', () => ({ emitToTenant: vi.fn() }));
vi.mock('../services/audit', () => ({ logAudit: vi.fn() }));
vi.mock('../auth', () => ({ auth: { api: {} } }));
vi.mock('../middleware/branch', () => ({ invalidateBranchCache: vi.fn() }));

import branches from './branches';

describe('GET /api/branches/public', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 400 for invalid tenant', async () => {
    vi.mocked(chainable.where).mockReturnValue({ limit: vi.fn(() => ({ then: vi.fn((resolve: (v: unknown) => unknown) => resolve([])) })) });
    mockDb.select.mockReturnValue(chainable);
    const app = new Hono();
    app.route('/api/branches', branches);
    const res = await app.request('/api/branches/public?tenant=nonexistent');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid tenant');
  });

  it('returns branch list for valid tenant', async () => {
    const mockBranches = [
      { id: 'b1', name: 'Mumbai HQ', address: 'Mumbai, India', phone: 'mumbai@test.com' },
      { id: 'b2', name: 'Delhi Branch', address: 'Delhi, India', phone: 'delhi@test.com' },
    ];
    const thenableWhere = vi.fn(() => ({ orderBy: vi.fn(() => ({ then: vi.fn((resolve: (v: unknown) => unknown) => resolve(mockBranches)) })) }));
    const thenableLimit = vi.fn((resolve: (v: unknown) => unknown) => resolve([{ id: 't1' }]));
    vi.mocked(chainable.where).mockReturnValueOnce({ limit: vi.fn(() => ({ then: thenableLimit })) });
    vi.mocked(chainable.where).mockReturnValue({ orderBy: vi.fn(() => ({ then: vi.fn((resolve: (v: unknown) => unknown) => resolve(mockBranches)) })) });
    mockDb.select.mockReturnValue(chainable);
    const app = new Hono();
    app.route('/api/branches', branches);
    const res = await app.request('/api/branches/public');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].name).toBe('Mumbai HQ');
  });
});
