import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { requestIdMiddleware } from './request-id.js';

function createTestApp() {
  const app = new Hono();
  app.use('*', requestIdMiddleware);
  app.get('/test', (c) => c.json({ ok: true }));
  return app;
}

describe('requestIdMiddleware', () => {
  it('sets x-request-id on response', async () => {
    const app = createTestApp();
    const res = await app.request('/test');
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });

  it('uses existing x-request-id header', async () => {
    const app = createTestApp();
    const res = await app.request('/test', {
      headers: { 'x-request-id': 'my-id-123' },
    });
    expect(res.headers.get('x-request-id')).toBe('my-id-123');
  });

  it('sets requestId variable', async () => {
    const app = new Hono();
    app.use('*', requestIdMiddleware);
    app.get('/test', (c) => c.json({ requestId: (c as any).get('requestId') }));
    const res = await app.request('/test', {
      headers: { 'x-request-id': 'req-456' },
    });
    const body = await res.json();
    expect(body.requestId).toBe('req-456');
  });

  it('passes through to next handler', async () => {
    const app = createTestApp();
    const res = await app.request('/test');
    expect(res.status).toBe(200);
  });
});
