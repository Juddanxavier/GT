import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

const mockRedis = { incr: vi.fn(), expire: vi.fn() };

vi.mock('../redis.js', () => ({
  get cacheClient() {
    return mockRedis.incr ? mockRedis : null;
  },
}));

import { globalRateLimit } from './rate-limit.js';

function createApp() {
  const app = new Hono();
  app.use('*', globalRateLimit());
  app.get('/test', (c) => c.json({ ok: true }));
  return app;
}

describe('globalRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes through when Redis is unavailable', async () => {
    const origIncr = mockRedis.incr;
    // @ts-expect-error: temporarily disable mock to simulate null cacheClient
    mockRedis.incr = null;
    const app = createApp();
    const res = await app.request('/test');
    expect(res.status).toBe(200);
    mockRedis.incr = origIncr;
  });

  it('sets rate limit headers', async () => {
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
    const app = createApp();
    const res = await app.request('/test', { headers: { 'x-forwarded-for': '1.2.3.4' } });
    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('60');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('59');
  });

  it('returns 429 when limit exceeded', async () => {
    mockRedis.incr.mockResolvedValue(99);
    mockRedis.expire.mockResolvedValue(1);
    const app = createApp();
    const res = await app.request('/test');
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain('Too many requests');
  });

  it('uses custom config', async () => {
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
    const app = new Hono();
    app.use('*', globalRateLimit({ windowSeconds: 10, maxRequests: 5 }));
    app.get('/test', (c) => c.json({ ok: true }));
    const res = await app.request('/test');
    expect(res.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('4');
  });

  it('skips on Redis error', async () => {
    mockRedis.incr.mockRejectedValue(new Error('Redis down'));
    mockRedis.expire.mockResolvedValue(1);
    const app = createApp();
    const res = await app.request('/test');
    expect(res.status).toBe(200);
  });
});
