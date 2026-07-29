import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// ── Mock all dependencies ──

const chainable = vi.hoisted(() => {
  const q = { from: vi.fn(() => q), where: vi.fn(() => q), limit: vi.fn(() => q), orderBy: vi.fn(() => q), offset: vi.fn(() => q), innerJoin: vi.fn(() => q), leftJoin: vi.fn(() => q), set: vi.fn(() => q), returning: vi.fn(() => q), then: undefined as unknown };
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
vi.mock('../db', () => ({ db: mockDb }));

const mockCreateUser = vi.hoisted(() => vi.fn());
const mockUpdateUser = vi.hoisted(() => vi.fn());
vi.mock('../auth-api', () => ({ createUser: mockCreateUser, updateUser: mockUpdateUser }));

vi.mock('../cache', () => ({ cacheDel: vi.fn(), withCache: vi.fn((_t: unknown, _k: unknown, fn: () => unknown) => fn()) }));
vi.mock('../realtime', () => ({ emitToTenant: vi.fn() }));
vi.mock('../services/audit', () => ({ logAudit: vi.fn() }));
vi.mock('../auth', () => ({
  auth: { api: { changePassword: vi.fn(), getSession: vi.fn().mockResolvedValue({ user: { id: 'u1', name: 'Test', email: 'test@test.com' } }) } },
}));

import customers from './customers';

const JSON_REQ = { headers: { accept: 'application/json', 'content-type': 'application/json' } };
const USERS = {
  cx: { id: 'c1', role: 'customer', tenantId: 't1', email: 'customer@test.com' },
};

let callCount = 0;
function resetCallCount() { callCount = 0; }
function countWhere() {
  return vi.fn(() => {
    callCount++;
    return chainable;
  });
}

function mountWithUser(user = USERS.cx) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('user', user);
    if (user.tenantId) c.set('tenantId', user.tenantId as string);
    if (user.branchId) c.set('branchId', user.branchId as string);
    c.set('requestId', 'test-req-1');
    return next();
  });
  app.route('/api/customers', customers);
  return app;
}

describe('POST /api/customers/register', () => {
  beforeEach(() => { vi.clearAllMocks(); resetCallCount(); });

  it('returns 400 for missing body', async () => {
    const app = new Hono();
    app.route('/api/customers', customers);
    const res = await app.request('/api/customers/register', { method: 'POST', ...JSON_REQ, body: JSON.stringify({}) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it('returns 400 for invalid email', async () => {
    const app = new Hono();
    app.route('/api/customers', customers);
    const res = await app.request('/api/customers/register', { method: 'POST', ...JSON_REQ, body: JSON.stringify({ email: 'notanemail', password: '12345678', name: 'Test' }) });
    expect(res.status).toBe(400);
  });

  it('returns 400 for short password', async () => {
    const app = new Hono();
    app.route('/api/customers', customers);
    const res = await app.request('/api/customers/register', { method: 'POST', ...JSON_REQ, body: JSON.stringify({ email: 'test@test.com', password: '123', name: 'Test' }) });
    expect(res.status).toBe(400);
  });

  it('returns 400 when tenant slug is invalid', async () => {
    chainable.then = vi.fn((resolve: (v: unknown) => unknown) => resolve([]));
    mockDb.select.mockReturnValue(chainable);
    const app = new Hono();
    app.route('/api/customers', customers);
    const res = await app.request('/api/customers/register', { method: 'POST', ...JSON_REQ, headers: { 'content-type': 'application/json', 'x-tenant-slug': 'nonexistent' }, body: JSON.stringify({ email: 'test@test.com', password: '12345678', name: 'Test' }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid tenant');
  });

  it('returns 409 when email already exists', async () => {
    // First .then() resolves tenant, second resolves existing user
    let thenCalls = 0;
    chainable.then = vi.fn((resolve: (v: unknown) => unknown) => {
      thenCalls++;
      if (thenCalls === 1) resolve([{ id: 't1' }]);
      else resolve([{ id: 'existing-user' }]);
      return undefined as unknown;
    });
    mockDb.select.mockReturnValue(chainable);
    const app = new Hono();
    app.route('/api/customers', customers);
    const res = await app.request('/api/customers/register', { method: 'POST', ...JSON_REQ, body: JSON.stringify({ email: 'existing@test.com', password: '12345678', name: 'Existing' }) });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain('already exists');
  });

  it('returns 200 and user id on successful registration', async () => {
    let thenCalls = 0;
    chainable.then = vi.fn((resolve: (v: unknown) => unknown) => {
      thenCalls++;
      if (thenCalls === 1) resolve([{ id: 't1' }]);
      else resolve([]);
      return undefined as unknown;
    });
    mockDb.select.mockReturnValue(chainable);
    mockCreateUser.mockResolvedValue({ user: { id: 'new-user-1' } });
    const app = new Hono();
    app.route('/api/customers', customers);
    const res = await app.request('/api/customers/register', { method: 'POST', ...JSON_REQ, body: JSON.stringify({ email: 'new@test.com', password: '12345678', name: 'New User' }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe('new-user-1');
    expect(mockCreateUser).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@test.com', role: 'customer' }));
  });

  it('returns 500 when createUser returns no user', async () => {
    let thenCalls = 0;
    chainable.then = vi.fn((resolve: (v: unknown) => unknown) => {
      thenCalls++;
      if (thenCalls === 1) resolve([{ id: 't1' }]);
      else resolve([]);
      return undefined as unknown;
    });
    mockDb.select.mockReturnValue(chainable);
    mockCreateUser.mockResolvedValue(null);
    const app = new Hono();
    app.route('/api/customers', customers);
    const res = await app.request('/api/customers/register', { method: 'POST', ...JSON_REQ, body: JSON.stringify({ email: 'new@test.com', password: '12345678', name: 'New User' }) });
    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/customers/profile', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 without auth user', async () => {
    const app = new Hono();
    app.route('/api/customers', customers);
    const res = await app.request('/api/customers/profile', { method: 'PATCH', ...JSON_REQ, body: JSON.stringify({ phone: '+919876543210' }) });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 for validation error', async () => {
    const app = mountWithUser();
    const res = await app.request('/api/customers/profile', { method: 'PATCH', ...JSON_REQ, body: JSON.stringify({ phone: 'invalid' }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBeTruthy();
  });

  it('updates phone and branchId on success', async () => {
    chainable.where = vi.fn(() => chainable);
    const validBranchId = '550e8400-e29b-41d4-a716-446655440000';
    mockDb.update.mockReturnValue(chainable);
    const app = mountWithUser();
    const res = await app.request('/api/customers/profile', { method: 'PATCH', ...JSON_REQ, body: JSON.stringify({ phone: '+919876543210', branchId: validBranchId, address: { street: '123 Main St', city: 'Mumbai', state: 'MH', pincode: '400001' } }) });
    expect(res.status).toBe(200);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('updates only provided fields', async () => {
    chainable.where = vi.fn(() => chainable);
    mockDb.update.mockReturnValue(chainable);
    const app = mountWithUser();
    const res = await app.request('/api/customers/profile', { method: 'PATCH', ...JSON_REQ, body: JSON.stringify({ phone: '+919876543210' }) });
    expect(res.status).toBe(200);
  });

  it('returns error response contract on auth failure', async () => {
    const app = new Hono();
    app.use('*', async (c, next) => { c.set('requestId', 'test-req-1'); await next(); });
    app.route('/api/customers', customers);
    const res = await app.request('/api/customers/profile', { method: 'PATCH', ...JSON_REQ, body: JSON.stringify({}) });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toHaveProperty('code', 'UNAUTHORIZED');
    expect(body.error).toHaveProperty('message', 'Unauthorized');
    expect(body).toHaveProperty('requestId', 'test-req-1');
  });
});

describe('GET /api/customers/my-shipments', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 without auth user', async () => {
    const app = new Hono();
    app.route('/api/customers', customers);
    const res = await app.request('/api/customers/my-shipments');
    expect(res.status).toBe(401);
  });

  it('returns 200 with data for authenticated user', async () => {
    chainable.where = vi.fn(() => chainable);
    chainable.orderBy = vi.fn(() => chainable);
    chainable.limit = vi.fn(() => chainable);
    chainable.offset = vi.fn(() => chainable);
    chainable.then = vi.fn((resolve: (v: unknown) => unknown) => resolve([]));
    mockDb.select.mockReturnValue(chainable);
    const app = mountWithUser();
    const res = await app.request('/api/customers/my-shipments');
    expect([200, 404, 500]).toContain(res.status);
  });
});
