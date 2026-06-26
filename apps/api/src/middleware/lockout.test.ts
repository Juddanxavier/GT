import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { Hono } from 'hono';

const mockAuthHandler = vi.hoisted(() => vi.fn());
const mockRedis: Record<string, any> = vi.hoisted(() => ({} as any));
const mockAudit = vi.hoisted(() => vi.fn());

beforeAll(() => {
  process.env.DATABASE_URL = 'postgres://localhost:5432/test';
});

vi.mock('../auth', () => ({
  auth: { handler: mockAuthHandler },
}));

vi.mock('../db', () => ({ db: {} }));

vi.mock('../redis', () => ({
  get cacheClient() {
    return mockRedis.incr ? (mockRedis as any) : null;
  },
}));

vi.mock('../services/audit', () => ({
  logAudit: (...args: any[]) => mockAudit(...args),
}));

import { signInHandler } from './lockout';

function mockRedisAvailable() {
  mockRedis.incr = vi.fn();
  mockRedis.del = vi.fn();
  mockRedis.get = vi.fn();
  mockRedis.setex = vi.fn();
  mockRedis.expire = vi.fn();
  mockRedis.ttl = vi.fn();
}

function mockRedisUnavailable() {
  mockRedis.incr = null as any;
}

describe('lockout - signInHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes through non-sign-in routes', async () => {
    const app = new Hono();
    app.all('/api/health', (c) => c.json({ ok: true }));
    app.post('/api/auth/sign-in/email', signInHandler);
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
  });

  it('works when Redis is unavailable', async () => {
    mockRedisUnavailable();
    mockAuthHandler.mockResolvedValue(new Response(JSON.stringify({ user: null }), { status: 401 }));
    const app = new Hono();
    app.post('/api/auth/sign-in/email', signInHandler);
    const res = await app.request('/api/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@test.com', password: 'x' }),
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(401);
  });

  it('blocks request when account is locked', async () => {
    mockRedisAvailable();
    mockRedis.get.mockResolvedValue('1');
    mockRedis.ttl.mockResolvedValue(900);
    const app = new Hono();
    app.post('/api/auth/sign-in/email', signInHandler);
    const res = await app.request('/api/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email: 'locked@test.com', password: 'x' }),
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(423);
    const body = await res.json();
    expect(body.error).toContain('Account locked');
    expect(body.error).toContain('15 minutes');
    expect(mockAudit).toHaveBeenCalledWith('LOGIN_BLOCKED', null, expect.objectContaining({ email: 'locked@test.com' }), expect.anything());
  });

  it('tracks failed attempts and locks after 5', async () => {
    mockRedisAvailable();
    let attempts = 0;
    mockRedis.get.mockResolvedValue(null);
    mockRedis.incr.mockImplementation(() => { attempts++; return attempts; });
    mockRedis.setex.mockResolvedValue('OK');
    mockRedis.expire.mockResolvedValue(1);
    mockRedis.del.mockResolvedValue(1);
    mockAuthHandler.mockResolvedValue(new Response(JSON.stringify({ error: 'Invalid' }), { status: 401 }));

    const app = new Hono();
    app.post('/api/auth/sign-in/email', signInHandler);

    for (let i = 1; i <= 5; i++) {
      const res = await app.request('/api/auth/sign-in/email', {
        method: 'POST',
        body: JSON.stringify({ email: 'fail@test.com', password: 'wrong' }),
        headers: { 'content-type': 'application/json' },
      });
      expect(res.status).toBe(401);
    }

    expect(mockRedis.setex).toHaveBeenCalledWith('lockout:fail@test.com', 1800, '1');
    expect(mockAudit).toHaveBeenCalledWith('USER_BANNED', null, expect.objectContaining({ email: 'fail@test.com', reason: expect.stringContaining('5 failed attempts') }), expect.anything());
  });

  it('clears attempts on successful login', async () => {
    mockRedisAvailable();
    mockRedis.get.mockResolvedValue(null);
    mockAuthHandler.mockResolvedValue(new Response(JSON.stringify({ user: { id: '1' }, session: 'abc' }), { status: 200 }));

    const app = new Hono();
    app.post('/api/auth/sign-in/email', signInHandler);
    const res = await app.request('/api/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email: 'success@test.com', password: 'correct' }),
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(200);
    expect(mockRedis.del).toHaveBeenCalledWith('lockout:success@test.com');
    expect(mockRedis.del).toHaveBeenCalledWith('attempts:success@test.com');
    expect(mockAudit).toHaveBeenCalledWith('LOGIN_SUCCESS', null, expect.objectContaining({ email: 'success@test.com' }), expect.anything());
  });
});
