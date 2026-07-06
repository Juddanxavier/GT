import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { bodyLimit } from 'hono/body-limit';
import { timeout } from 'hono/timeout';
import { securityHeadersMiddleware } from './middleware/security-headers';
import { requestIdMiddleware, type RequestIdVariables } from './middleware/request-id';
import { errorResponse } from './error-response';

function createApp() {
  const app = new Hono<{ Variables: RequestIdVariables }>();

  app.use('*', bodyLimit({ maxSize: 5 * 1024 * 1024, onError: (c) => errorResponse(c, 'PAYLOAD_TOO_LARGE', 'Request body exceeds 5 MB limit', 413) }));

  app.use('*', async (c, next) => {
    const method = c.req.method;
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      const ct = c.req.header('Content-Type') ?? '';
      if (!ct.includes('application/json') && !ct.includes('multipart/form-data')) {
        return errorResponse(c, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json', 415);
      }
    }
    await next();
  });

  app.use('*', timeout(60000));
  app.use('*', compress());
  app.use('*', requestIdMiddleware);
  app.use('*', securityHeadersMiddleware);

  app.get('/api/health', (c) => c.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() }));

  app.get('/api/*', (c) => errorResponse(c, 'ROUTE_NOT_FOUND', `Route not found: ${c.req.path}`, 404));
  app.post('/api/*', (c) => errorResponse(c, 'ROUTE_NOT_FOUND', `Route not found: ${c.req.path}`, 404));

  app.onError((err, c) => {
    const requestId = c.get('requestId');
    console.error(err, requestId);
    return errorResponse(c, 'INTERNAL_ERROR', 'Internal server error', 500);
  });

  return app;
}

const app = createApp();

describe('API smoke tests', () => {
  it('GET /api/health returns 200 with status ok', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(body.timestamp).toBeTruthy();
  });

  it('unknown routes return 404 with error contract', async () => {
    const res = await app.request('/api/nonexistent');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(body.error.message).toContain('/api/nonexistent');
    expect(body.requestId).toBeTruthy();
  });

  it('sets security headers on every response', async () => {
    const res = await app.request('/api/health');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
  });

  it('sets x-request-id header', async () => {
    const res = await app.request('/api/health');
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });

  it('preserves existing x-request-id header', async () => {
    const res = await app.request('/api/health', {
      headers: { 'x-request-id': 'test-request-123' },
    });
    expect(res.headers.get('x-request-id')).toBe('test-request-123');
  });

  it('POST without Content-Type is rejected', async () => {
    const res = await app.request('/api/health', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {},
    });
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('POST with Content-Type application/json succeeds', async () => {
    const res = await app.request('/api/nonexistent', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(404);
  });

  it('request body limited to 5MB', async () => {
    const res = await app.request('/api/health', {
      method: 'POST',
      body: 'x'.repeat(6 * 1024 * 1024),
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('global error handler returns structured 500', async () => {
    const errorApp = new Hono<{ Variables: RequestIdVariables }>();
    errorApp.use('*', requestIdMiddleware);
    errorApp.get('/api/crash', () => {
      throw new Error('test unhandled error');
    });
    errorApp.onError((err, c) => {
      console.error(err);
      return errorResponse(c, 'INTERNAL_ERROR', 'Internal server error', 500);
    });
    const res = await errorApp.request('/api/crash');
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Internal server error');
    expect(body.requestId).toBeTruthy();
  });
});
