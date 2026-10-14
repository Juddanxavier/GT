import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { type LoggerVariables, logger } from '../logger';

let mockRedisEnabled = true;
const mockRedis = { incr: vi.fn(), expire: vi.fn() };

vi.mock('../redis.js', () => ({
  get cacheClient() {
    return mockRedisEnabled ? mockRedis : null;
  },
}));

import { globalRateLimit } from './rate-limit.js';

function createApp() {
  const app = new Hono<{ Variables: LoggerVariables }>();
  // The middleware logs through the request logger, so the harness sets one
  // the same way the real app's request-id middleware does.
  app.use('*', async (c, next) => {
    c.set('logger', logger);
    await next();
  });
  app.use('*', globalRateLimit());
  app.get('/test', (c) => c.json({ ok: true }));
  return app;
}

describe('globalRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes through when Redis is unavailable', async () => {
    mockRedisEnabled = false;
    const app = createApp();
    const res = await app.request('/test');
    expect(res.status).toBe(200);
    mockRedisEnabled = true;
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
    expect(body.error.message).toContain('Too many requests');
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
