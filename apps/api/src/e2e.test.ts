import { describe, it, expect, beforeAll } from 'vitest';

const e2e = process.env.E2E === 'true' ? describe : describe.skip;
const itE2E = process.env.E2E === 'true' ? it : it.skip;

e2e('E2E API', () => {
  let db: Awaited<ReturnType<typeof import('./db')>>['db'];
  let app: Awaited<ReturnType<typeof import('./index')>>['app'];

  beforeAll(async () => {
    const dbModule = await import('./db');
    const indexModule = await import('./index');
    db = dbModule.db;
    app = indexModule.app;
  });

  itE2E('GET /api/health returns 200 with status ok', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('uptime');
    expect(body).toHaveProperty('timestamp');
  });

  itE2E('GET /api/ready checks DB connectivity', async () => {
    const res = await app.request('/api/ready');
    const body = await res.json();
    expect(body).toHaveProperty('checks');
    expect(body.checks).toHaveProperty('database');
    expect(body.checks).toHaveProperty('redis');
    if (body.status === 'ok') {
      expect(res.status).toBe(200);
    } else {
      expect(res.status).toBe(503);
    }
  });

  itE2E('GET /api/me returns 401 when not authenticated', async () => {
    const res = await app.request('/api/me');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toHaveProperty('code', 'AUTH_REQUIRED');
  });

  itE2E('unknown routes return 404', async () => {
    const res = await app.request('/api/nonexistent-route');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(body.requestId).toBeTruthy();
  });

  itE2E('sets security headers', async () => {
    const res = await app.request('/api/health');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });

  itE2E('DB is reachable', async () => {
    const { sql } = await import('drizzle-orm');
    const result = await db.execute(sql`SELECT 1 AS ok`);
    expect(result).toBeTruthy();
  });

  itE2E('POST without Content-Type is rejected', async () => {
    const res = await app.request('/api/nonexistent', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(415);
  });
});
