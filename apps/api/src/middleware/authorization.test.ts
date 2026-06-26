import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { requireRole, requireBranchScope, getQueryScope } from './authorization';

function setUser(c: any, user: Record<string, any>) {
  c.set('user', user);
}

function setTenant(c: any, tenantId: string) {
  c.set('tenantId', tenantId);
}

describe('requireRole', () => {
  it('blocks unauthenticated requests', async () => {
    const app = new Hono();
    app.get('/test', requireRole('superadmin'), (c) => c.json({ ok: true }));
    const res = await app.request('/test');
    expect(res.status).toBe(401);
  });

  it('passes with matching role', async () => {
    const app = new Hono();
    app.use('*', (c, next) => {
      setUser(c, { id: '1', role: 'superadmin' });
      return next();
    });
    app.get('/test', requireRole('superadmin'), (c) => c.json({ ok: true }));
    const res = await app.request('/test');
    expect(res.status).toBe(200);
  });

  it('blocks with mismatched role returns JSON', async () => {
    const app = new Hono();
    app.use('*', (c, next) => {
      setUser(c, { id: '1', role: 'staff' });
      return next();
    });
    app.get('/test', requireRole('superadmin'), (c) => c.json({ ok: true }));
    const res = await app.request('/test', {
      headers: { accept: 'application/json' },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('insufficient permissions');
  });

  it('redirects on mismatched role for browser requests', async () => {
    const app = new Hono();
    app.use('*', (c, next) => {
      setUser(c, { id: '1', role: 'staff' });
      return next();
    });
    app.get('/test', requireRole('superadmin'), (c) => c.json({ ok: true }));
    const res = await app.request('/test');
    expect(res.status).toBe(302);
  });

  it('accepts multiple roles', async () => {
    const app = new Hono();
    app.use('*', (c, next) => {
      setUser(c, { id: '1', role: 'tenant-admin' });
      return next();
    });
    app.get('/test', requireRole('superadmin', 'tenant-admin'), (c) => c.json({ ok: true }));
    const res = await app.request('/test');
    expect(res.status).toBe(200);
  });
});

describe('requireBranchScope', () => {
  it('passes through for non-staff roles', async () => {
    const app = new Hono();
    app.use('*', (c, next) => {
      setUser(c, { id: '1', role: 'superadmin' });
      return next();
    });
    app.get('/test', requireBranchScope(), (c) => c.json({ ok: true }));
    const res = await app.request('/test?branchId=other');
    expect(res.status).toBe(200);
  });

  it('blocks staff without branch assignment', async () => {
    const app = new Hono();
    app.use('*', (c, next) => {
      setUser(c, { id: '1', role: 'staff' });
      return next();
    });
    app.get('/test', requireBranchScope(), (c) => c.json({ ok: true }));
    const res = await app.request('/test?branchId=branch-1');
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('No branch assigned');
  });

  it('passes staff with matching query branchId', async () => {
    const app = new Hono();
    app.use('*', (c, next) => {
      setUser(c, { id: '1', role: 'staff', branchId: 'branch-1' });
      return next();
    });
    app.get('/test', requireBranchScope(), (c) => c.json({ ok: true }));
    const res = await app.request('/test?branchId=branch-1');
    expect(res.status).toBe(200);
  });

  it('blocks staff with mismatched query branchId', async () => {
    const app = new Hono();
    app.use('*', (c, next) => {
      setUser(c, { id: '1', role: 'staff', branchId: 'branch-1' });
      return next();
    });
    app.get('/test', requireBranchScope(), (c) => c.json({ ok: true }));
    const res = await app.request('/test?branchId=branch-2');
    expect(res.status).toBe(403);
  });

  it('blocks staff with mismatched param branchId', async () => {
    const app = new Hono();
    app.use('*', (c, next) => {
      setUser(c, { id: '1', role: 'staff', branchId: 'branch-1' });
      return next();
    });
    app.get('/test/:branchId', requireBranchScope(), (c) => c.json({ ok: true }));
    const res = await app.request('/test/branch-2');
    expect(res.status).toBe(403);
  });
});

describe('getQueryScope', () => {
  it('returns branchId for staff from user', async () => {
    const app = new Hono();
    app.use('*', (c, next) => {
      setUser(c, { id: '1', role: 'staff', tenantId: 'tenant-1', branchId: 'branch-1' });
      return next();
    });
    app.get('/test', (c) => {
      const scope = getQueryScope(c);
      return c.json(scope);
    });
    const res = await app.request('/test');
    const body = await res.json();
    expect(body).toEqual({ tenantId: 'tenant-1', branchId: 'branch-1' });
  });

  it('returns tenantId only for tenant-admin without override', async () => {
    const app = new Hono();
    app.use('*', (c, next) => {
      setUser(c, { id: '1', role: 'tenant-admin', tenantId: 'tenant-1', branchId: null });
      setTenant(c, 'tenant-1');
      return next();
    });
    app.get('/test', (c) => {
      const scope = getQueryScope(c);
      return c.json(scope);
    });
    const res = await app.request('/test');
    const body = await res.json();
    expect(body).toEqual({ tenantId: 'tenant-1' });
  });

  it('returns empty scope for superadmin without override', async () => {
    const app = new Hono();
    app.use('*', (c, next) => {
      setUser(c, { id: '1', role: 'superadmin', tenantId: null, branchId: null });
      return next();
    });
    app.get('/test', (c) => {
      const scope = getQueryScope(c);
      return c.json(scope);
    });
    const res = await app.request('/test');
    const body = await res.json();
    expect(body).toEqual({});
  });

  it('returns override tenant for superadmin with X-Tenant-ID', async () => {
    const app = new Hono();
    app.use('*', (c, next) => {
      setUser(c, { id: '1', role: 'superadmin', tenantId: null, branchId: null });
      setTenant(c, 'override-tenant');
      return next();
    });
    app.get('/test', (c) => {
      const scope = getQueryScope(c);
      return c.json(scope);
    });
    const res = await app.request('/test');
    const body = await res.json();
    expect(body).toEqual({ tenantId: 'override-tenant' });
  });
});
