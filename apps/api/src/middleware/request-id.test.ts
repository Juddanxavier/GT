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

  it('replaces an invalid inbound id with a fresh UUID', async () => {
    const app = createTestApp();
    const res = await app.request('/test', {
      headers: { 'x-request-id': 'bad id with spaces!!' },
    });
    const id = res.headers.get('x-request-id');
    expect(id).not.toBe('bad id with spaces!!');
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('replaces an inbound id longer than 128 characters with a fresh UUID', async () => {
    const app = createTestApp();
    const longId = 'a'.repeat(129);
    const res = await app.request('/test', {
      headers: { 'x-request-id': longId },
    });
    const id = res.headers.get('x-request-id');
    expect(id).not.toBe(longId);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('keeps an inbound id of exactly 128 valid characters', async () => {
    const app = createTestApp();
    const longId = 'a'.repeat(128);
    const res = await app.request('/test', {
      headers: { 'x-request-id': longId },
    });
    expect(res.headers.get('x-request-id')).toBe(longId);
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
