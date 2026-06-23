import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { securityHeadersMiddleware } from './security-headers.js';

function createTestApp() {
  const app = new Hono();
  app.use('*', securityHeadersMiddleware);
  app.get('/test', (c) => c.json({ ok: true }));
  return app;
}

describe('securityHeadersMiddleware', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
  });

  it('sets X-Content-Type-Options', async () => {
    const res = await app.request('/test');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('sets X-Frame-Options', async () => {
    const res = await app.request('/test');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('sets Referrer-Policy', async () => {
    const res = await app.request('/test');
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });

  it('sets Permissions-Policy', async () => {
    const res = await app.request('/test');
    expect(res.headers.get('Permissions-Policy')).toBeTruthy();
  });

  it('sets Content-Security-Policy', async () => {
    const res = await app.request('/test');
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
  });

  it('does not set HSTS in non-production', async () => {
    const res = await app.request('/test');
    expect(res.headers.get('Strict-Transport-Security')).toBeNull();
  });

  it('sets response body correctly', async () => {
    const res = await app.request('/test');
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it('sets headers on POST requests', async () => {
    const app2 = new Hono();
    app2.use('*', securityHeadersMiddleware);
    app2.post('/data', (c) => c.json({ received: true }));
    const res = await app2.request('/data', { method: 'POST' });
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });
});
