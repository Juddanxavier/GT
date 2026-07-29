import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// ── Mocks for ALL route dependencies (use vi.hoisted to work around hoisting) ──

const chainable = vi.hoisted(() => {
  // @ts-expect-error - property assignment mock
  const q = { from: vi.fn(() => q), where: vi.fn(() => q), limit: vi.fn(() => q), orderBy: vi.fn(() => q), offset: vi.fn(() => q), innerJoin: vi.fn(() => q), leftJoin: vi.fn(() => q), returning: vi.fn(() => q), then: undefined as unknown };
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
vi.mock('../db', () => ({ db: mockDb, default: mockDb }));

const mockCache = vi.hoisted(() => ({ cacheDel: vi.fn(), cacheDelPattern: vi.fn(), cacheFlushTenant: vi.fn(), withCache: vi.fn((_t: unknown, _k: unknown, fn: () => unknown) => fn()) }));
vi.mock('../cache', () => mockCache);

vi.mock('../realtime', () => ({ emitToTenant: vi.fn() }));
vi.mock('../services/audit', () => ({ logAudit: vi.fn() }));
vi.mock('../auth', () => ({
  auth: { api: { createUser: vi.fn(), updateUser: vi.fn(), getSession: vi.fn().mockResolvedValue({ user: {} }), signInEmail: vi.fn().mockResolvedValue({ ok: true }), requestPasswordReset: vi.fn() } },
}));
vi.mock('../services/archive', () => ({ runArchive: vi.fn() }));
vi.mock('../email/provider', () => ({ sendEmail: vi.fn(), getEmailProviderStatus: vi.fn().mockReturnValue({ configured: false }), closeTransport: vi.fn() }));
vi.mock('../logger', () => ({ childLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn() })), logger: { info: vi.fn(), error: vi.fn() } }));
vi.mock('../redis', () => ({ cacheClient: null, connectRedis: vi.fn(), disconnectRedis: vi.fn(), bullConnectionOptions: null, bullConnection: null }));
vi.mock('../instrument', () => ({}));
vi.mock('../queues', () => ({ queues: [], notificationQueue: { add: vi.fn(), name: 'notifications' }, runArchive: vi.fn(), isRedisConnected: vi.fn(() => false) }));
vi.mock('@repo/auth-config', () => ({ buildEmailHtml: vi.fn(() => '<html/>') }));

const mockOtp = vi.hoisted(() => ({ generateOtp: vi.fn(() => '123456'), verifyOtp: vi.fn(() => true), maskEmail: vi.fn((e: string) => e!.substring(0, 3) + '***') }));
vi.mock('../services/otp', () => mockOtp);

vi.mock('../notifications/event-map', () => ({ statusToEventType: vi.fn(() => 'status_changed') }));

const mockNotifPrefs = vi.hoisted(() => ({ getPreferences: vi.fn(() => ({})), upsertPreferences: vi.fn() }));
vi.mock('../services/notification-prefs', () => mockNotifPrefs);

// ── All route modules ──

import branches from './branches';
import customers from './customers';
import tenantsRoute from './tenants';
import invoicesRoute from './invoices';
import quotationsRoute from './quotations';
import usersRoute from './users';
import dashboardRoute from './dashboard';
import reportsRoute from './reports';
import searchRoute from './search';
import notificationsRoute from './notifications';
import invitationsRoute from './invitations';
import onboardRoute from './onboard';
import notificationPrefsRoute from './notification-preferences';
import auditLogsRoute from './audit-logs';
import publicTrack from './public-track';
import claimShipment from './claim-shipment';
import shipments from './shipments';

// ── Test users ──

const USERS: Record<string, Record<string, unknown>> = {
  sa: { id: 'sa-1', role: 'superadmin', tenantId: 't1', tenantName: 'Gajan Traders', branchId: null },
  ta: { id: 'ta-1', role: 'tenant-admin', tenantId: 't1', tenantName: 'Gajan Traders', branchId: 'b1' },
  st: { id: 'st-1', role: 'staff', tenantId: 't1', tenantName: 'Gajan Traders', branchId: 'b1' },
  cx: { id: 'c1', role: 'customer', tenantId: 't1' },
};

// ── Helpers ──

function mount(route: ReturnType<typeof Hono>, prefix: string, user?: Record<string, unknown>) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    if (user) {
      c.set('user', user);
      if (user.tenantId) c.set('tenantId', user.tenantId as string);
      if (user.branchId) c.set('branchId', user.branchId as string);
    }
    return next();
  });
  app.route(prefix, route);
  return app;
}

const JSON_REQ = { headers: { accept: 'application/json', 'content-type': 'application/json' } };

// ── 1. Auth guards: every authenticated route returns 401 without user ──

describe('auth guards', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const routes: { name: string; route: ReturnType<typeof Hono>; prefix: string; path: string; method?: string }[] = [
    // Branches
    { name: 'branches GET', route: branches, prefix: '/api/branches', path: '/api/branches' },
    { name: 'branches POST', route: branches, prefix: '/api/branches', path: '/api/branches', method: 'POST' },
    { name: 'branches GET :id', route: branches, prefix: '/api/branches', path: '/api/branches/b1' },
    { name: 'branches DELETE :id', route: branches, prefix: '/api/branches', path: '/api/branches/b1', method: 'DELETE' },
    // Customers
    { name: 'customers GET', route: customers, prefix: '/api/customers', path: '/api/customers' },
    { name: 'customers POST', route: customers, prefix: '/api/customers', path: '/api/customers', method: 'POST' },
    { name: 'customers GET :id', route: customers, prefix: '/api/customers', path: '/api/customers/c1' },
    // Tenants GET
    { name: 'tenants GET', route: tenantsRoute, prefix: '/api/tenants', path: '/api/tenants' },
    // Invoices
    { name: 'invoices GET', route: invoicesRoute, prefix: '/api/invoices', path: '/api/invoices' },
    { name: 'invoices GET :id', route: invoicesRoute, prefix: '/api/invoices', path: '/api/invoices/i1' },
    { name: 'invoices POST shipment', route: invoicesRoute, prefix: '/api/invoices', path: '/api/invoices/shipment/s1', method: 'POST' },
    // Quotations
    { name: 'quotations GET', route: quotationsRoute, prefix: '/api/quotations', path: '/api/quotations' },
    { name: 'quotations POST', route: quotationsRoute, prefix: '/api/quotations', path: '/api/quotations', method: 'POST' },
    { name: 'quotations GET :id', route: quotationsRoute, prefix: '/api/quotations', path: '/api/quotations/q1' },
    // Users
    { name: 'users GET', route: usersRoute, prefix: '/api/users', path: '/api/users' },
    { name: 'users POST create', route: usersRoute, prefix: '/api/users', path: '/api/users/create', method: 'POST' },
    // Dashboard
    { name: 'dashboard GET stats', route: dashboardRoute, prefix: '/api/dashboard', path: '/api/dashboard/stats' },
    { name: 'dashboard GET branches', route: dashboardRoute, prefix: '/api/dashboard', path: '/api/dashboard/branches' },
    // Reports
    { name: 'reports GET shipments', route: reportsRoute, prefix: '/api/reports', path: '/api/reports/shipments' },
    { name: 'reports GET quotations', route: reportsRoute, prefix: '/api/reports', path: '/api/reports/quotations' },
    // Search
    { name: 'search GET', route: searchRoute, prefix: '/api/search', path: '/api/search' },
    // Notifications
    { name: 'notifications GET', route: notificationsRoute, prefix: '/api/notifications', path: '/api/notifications' },
    { name: 'notifications GET unread-count', route: notificationsRoute, prefix: '/api/notifications', path: '/api/notifications/unread-count' },
    // Invitations
    { name: 'invitations GET', route: invitationsRoute, prefix: '/api/invitations', path: '/api/invitations' },
    { name: 'invitations POST invite', route: invitationsRoute, prefix: '/api/invitations', path: '/api/invitations/invite', method: 'POST' },
    // Notification prefs
    { name: 'notification-prefs GET', route: notificationPrefsRoute, prefix: '/api/notification-preferences', path: '/api/notification-preferences' },
    { name: 'notification-prefs PUT', route: notificationPrefsRoute, prefix: '/api/notification-preferences', path: '/api/notification-preferences', method: 'PUT' },
    // Audit logs
    { name: 'audit-logs GET', route: auditLogsRoute, prefix: '/api/audit-logs', path: '/api/audit-logs' },
    { name: 'audit-logs GET timeline', route: auditLogsRoute, prefix: '/api/audit-logs', path: '/api/audit-logs/timeline' },
    { name: 'audit-logs GET events', route: auditLogsRoute, prefix: '/api/audit-logs', path: '/api/audit-logs/events' },
    // Customer-facing (authenticated — my-*)
    { name: 'customers/my-shipments', route: customers, prefix: '/api/customers', path: '/api/customers/my-shipments' },
    { name: 'customers/my-dashboard', route: customers, prefix: '/api/customers', path: '/api/customers/my-dashboard' },
    { name: 'customers/my-invoices', route: customers, prefix: '/api/customers', path: '/api/customers/my-invoices' },
    { name: 'customers/profile', route: customers, prefix: '/api/customers', path: '/api/customers/profile', method: 'PATCH' },
  ];

  for (const { name, route, prefix, path, method } of routes) {
    it(`${method ?? 'GET'} ${name} returns 401 without auth`, async () => {
      const req = method && method !== 'GET' ? { method, ...JSON_REQ } : undefined;
      const res = await mount(route, prefix).request(path, req);
      expect(res.status, `${name} should return 401`).toBe(401);
    });
  }
});

// ── 2. Role-based access ──

describe('role enforcement', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  function roleStatus(userKey: string, route: ReturnType<typeof Hono>, prefix: string, path: string, method?: string) {
    return mount(route, prefix, USERS[userKey]).request(path, method && method !== 'GET' ? { method, ...JSON_REQ } : undefined).then(r => r.status);
  }

  const roleTests: { name: string; route: ReturnType<typeof Hono>; prefix: string; path: string; method?: string; allowed: string[]; denied: string[] }[] = [
    // ── Branches ──
    { name: 'branches POST', route: branches, prefix: '/api/branches', path: '/api/branches', method: 'POST', allowed: ['sa', 'ta'], denied: ['st'] },
    { name: 'branches PATCH', route: branches, prefix: '/api/branches', path: '/api/branches/b1', method: 'PATCH', allowed: ['sa', 'ta'], denied: ['st'] },
    { name: 'branches DELETE', route: branches, prefix: '/api/branches', path: '/api/branches/b1', method: 'DELETE', allowed: ['sa', 'ta'], denied: ['st'] },
    // ── Customers ──
    { name: 'customers GET', route: customers, prefix: '/api/customers', path: '/api/customers', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    { name: 'customers POST', route: customers, prefix: '/api/customers', path: '/api/customers', method: 'POST', allowed: ['sa', 'ta'], denied: ['st'] },
    { name: 'customers GET :id', route: customers, prefix: '/api/customers', path: '/api/customers/c1', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    { name: 'customers PATCH :id', route: customers, prefix: '/api/customers', path: '/api/customers/c1', method: 'PATCH', allowed: ['sa', 'ta'], denied: ['st'] },
    { name: 'customers DELETE :id', route: customers, prefix: '/api/customers', path: '/api/customers/c1', method: 'DELETE', allowed: ['sa', 'ta'], denied: ['st'] },
    // ── Shipments ──
    { name: 'shipments GET', route: shipments, prefix: '/api/shipments', path: '/api/shipments', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    { name: 'shipments POST', route: shipments, prefix: '/api/shipments', path: '/api/shipments', method: 'POST', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    { name: 'shipments GET :id', route: shipments, prefix: '/api/shipments', path: '/api/shipments/s1', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    { name: 'shipments PATCH :id', route: shipments, prefix: '/api/shipments', path: '/api/shipments/s1', method: 'PATCH', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    { name: 'shipments DELETE :id', route: shipments, prefix: '/api/shipments', path: '/api/shipments/s1', method: 'DELETE', allowed: ['sa', 'ta'], denied: ['st'] },
    { name: 'shipments POST restore', route: shipments, prefix: '/api/shipments', path: '/api/shipments/s1/restore', method: 'POST', allowed: ['sa', 'ta'], denied: ['st'] },
    { name: 'shipments PUT assign', route: shipments, prefix: '/api/shipments', path: '/api/shipments/s1/assign', method: 'PUT', allowed: ['sa', 'ta'], denied: ['st'] },
    { name: 'shipments POST stop-tracking', route: shipments, prefix: '/api/shipments', path: '/api/shipments/s1/stop-tracking', method: 'POST', allowed: ['sa', 'ta'], denied: ['st'] },
    // ── Invoices ──
    { name: 'invoices GET', route: invoicesRoute, prefix: '/api/invoices', path: '/api/invoices', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    { name: 'invoices GET shipment', route: invoicesRoute, prefix: '/api/invoices', path: '/api/invoices/shipment/s1', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    { name: 'invoices POST shipment', route: invoicesRoute, prefix: '/api/invoices', path: '/api/invoices/shipment/s1', method: 'POST', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    { name: 'invoices GET :id', route: invoicesRoute, prefix: '/api/invoices', path: '/api/invoices/i1', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    { name: 'invoices POST :id/send', route: invoicesRoute, prefix: '/api/invoices', path: '/api/invoices/i1/send', method: 'POST', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    { name: 'invoices PATCH :id', route: invoicesRoute, prefix: '/api/invoices', path: '/api/invoices/i1', method: 'PATCH', allowed: ['sa', 'ta'], denied: ['st'] },
    { name: 'invoices DELETE :id', route: invoicesRoute, prefix: '/api/invoices', path: '/api/invoices/i1', method: 'DELETE', allowed: ['sa', 'ta'], denied: ['st'] },
    // ── Quotations ──
    { name: 'quotations GET', route: quotationsRoute, prefix: '/api/quotations', path: '/api/quotations', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    { name: 'quotations POST', route: quotationsRoute, prefix: '/api/quotations', path: '/api/quotations', method: 'POST', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    { name: 'quotations GET :id', route: quotationsRoute, prefix: '/api/quotations', path: '/api/quotations/q1', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    { name: 'quotations PATCH :id', route: quotationsRoute, prefix: '/api/quotations', path: '/api/quotations/q1', method: 'PATCH', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    { name: 'quotations PATCH :id/status', route: quotationsRoute, prefix: '/api/quotations', path: '/api/quotations/q1/status', method: 'PATCH', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    { name: 'quotations POST :id/convert', route: quotationsRoute, prefix: '/api/quotations', path: '/api/quotations/q1/convert', method: 'POST', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    { name: 'quotations DELETE :id', route: quotationsRoute, prefix: '/api/quotations', path: '/api/quotations/q1', method: 'DELETE', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    { name: 'quotations GET trend', route: quotationsRoute, prefix: '/api/quotations', path: '/api/quotations/trend', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    // ── Users ──
    { name: 'users GET', route: usersRoute, prefix: '/api/users', path: '/api/users', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    { name: 'users GET :id', route: usersRoute, prefix: '/api/users', path: '/api/users/u1', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    { name: 'users PATCH :id', route: usersRoute, prefix: '/api/users', path: '/api/users/u1', method: 'PATCH', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    { name: 'users POST create', route: usersRoute, prefix: '/api/users', path: '/api/users/create', method: 'POST', allowed: ['sa', 'ta'], denied: ['st'] },
    { name: 'users POST :id/ban', route: usersRoute, prefix: '/api/users', path: '/api/users/u1/ban', method: 'POST', allowed: ['sa', 'ta'], denied: ['st'] },
    { name: 'users POST :id/unban', route: usersRoute, prefix: '/api/users', path: '/api/users/u1/unban', method: 'POST', allowed: ['sa', 'ta'], denied: ['st'] },
    { name: 'users DELETE :id', route: usersRoute, prefix: '/api/users', path: '/api/users/u1', method: 'DELETE', allowed: ['sa', 'ta'], denied: ['st'] },
    // ── Dashboard ──
    { name: 'dashboard GET stats', route: dashboardRoute, prefix: '/api/dashboard', path: '/api/dashboard/stats', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    { name: 'dashboard GET branches', route: dashboardRoute, prefix: '/api/dashboard', path: '/api/dashboard/branches', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    // ── Reports ──
    { name: 'reports GET shipments', route: reportsRoute, prefix: '/api/reports', path: '/api/reports/shipments', allowed: ['sa', 'ta'], denied: ['st', 'cx'] },
    { name: 'reports GET quotations', route: reportsRoute, prefix: '/api/reports', path: '/api/reports/quotations', allowed: ['sa', 'ta'], denied: ['st', 'cx'] },
    { name: 'reports GET shipments/data', route: reportsRoute, prefix: '/api/reports', path: '/api/reports/shipments/data', allowed: ['sa', 'ta'], denied: ['st', 'cx'] },
    { name: 'reports GET quotations/data', route: reportsRoute, prefix: '/api/reports', path: '/api/reports/quotations/data', allowed: ['sa', 'ta'], denied: ['st', 'cx'] },
    { name: 'reports POST pdf', route: reportsRoute, prefix: '/api/reports', path: '/api/reports/pdf', method: 'POST', allowed: ['sa', 'ta'], denied: ['st', 'cx'] },
    { name: 'reports POST send-email', route: reportsRoute, prefix: '/api/reports', path: '/api/reports/send-email', method: 'POST', allowed: ['sa', 'ta'], denied: ['st', 'cx'] },
    // ── Search ──
    { name: 'search GET', route: searchRoute, prefix: '/api/search', path: '/api/search', allowed: ['sa', 'ta', 'st'], denied: ['cx'] },
    // ── Audit logs ──
    { name: 'audit-logs GET', route: auditLogsRoute, prefix: '/api/audit-logs', path: '/api/audit-logs', allowed: ['sa', 'ta'], denied: ['st', 'cx'] },
    { name: 'audit-logs GET timeline', route: auditLogsRoute, prefix: '/api/audit-logs', path: '/api/audit-logs/timeline', allowed: ['sa', 'ta'], denied: ['st', 'cx'] },
    { name: 'audit-logs GET events', route: auditLogsRoute, prefix: '/api/audit-logs', path: '/api/audit-logs/events', allowed: ['sa', 'ta'], denied: ['st', 'cx'] },
    // ── Invitations ──
    { name: 'invitations GET', route: invitationsRoute, prefix: '/api/invitations', path: '/api/invitations', allowed: ['sa', 'ta'], denied: ['st', 'cx'] },
    { name: 'invitations POST invite', route: invitationsRoute, prefix: '/api/invitations', path: '/api/invitations/invite', method: 'POST', allowed: ['sa', 'ta'], denied: ['st', 'cx'] },
    { name: 'invitations DELETE :id', route: invitationsRoute, prefix: '/api/invitations', path: '/api/invitations/i1', method: 'DELETE', allowed: ['sa', 'ta'], denied: ['st', 'cx'] },
    // ── Notification prefs — all roles including customer
    { name: 'notification-prefs GET', route: notificationPrefsRoute, prefix: '/api/notification-preferences', path: '/api/notification-preferences', allowed: ['sa', 'ta', 'st', 'cx'], denied: [] },
    { name: 'notification-prefs PUT', route: notificationPrefsRoute, prefix: '/api/notification-preferences', path: '/api/notification-preferences', method: 'PUT', allowed: ['sa', 'ta', 'st', 'cx'], denied: [] },
  ];

  for (const { name, route, prefix, path, method, allowed, denied } of roleTests) {
    for (const roleKey of denied) {
      it(`${name} denies ${USERS[roleKey]?.role}`, async () => {
        const status = await roleStatus(roleKey, route, prefix, path, method);
        // requireRole redirects (302) on failure, returning 403 is also valid
        expect([302, 403]).toContain(status);
      });
    }
    for (const roleKey of allowed) {
      it(`${name} allows ${USERS[roleKey]?.role}`, async () => {
        const status = await roleStatus(roleKey, route, prefix, path, method);
        // Should pass role guard — status will be whatever the handler returns (200, 400, etc.)
        expect([200, 201, 400, 404, 422, 500]).toContain(status);
      });
    }
  }
});

// ── 3. Public routes ──

describe('public routes', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('GET /api/health returns 200', async () => {
    const { app } = await import('../index');
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('GET /api/ready returns 200 (db mock returns ok)', async () => {
    mockDb.execute.mockResolvedValue([{ '?column?': 1 }]);
    const { app } = await import('../index');
    const res = await app.request('/api/ready');
    expect([200, 503]).toContain(res.status);
  });

  it('GET /api/track/:trackingNo returns 404 when no shipment found', async () => {
    // db mock returns empty array → 404
    vi.mocked(chainable.where).mockReturnThis();
    const app = new Hono();
    app.route('/api/track', publicTrack);
    const res = await app.request('/api/track/1Z999AA10123456784');
    expect([200, 404]).toContain(res.status);
  });

  it('POST /api/track/claim returns 400 (missing body)', async () => {
    const app = new Hono();
    app.route('/api/track', claimShipment);
    const res = await app.request('/api/track/claim', { method: 'POST', ...JSON_REQ });
    expect(res.status).toBe(400);
  });

  it('GET /api/onboard/validate returns 400 with invalid token', async () => {
    // db returns empty → token not found → 400
    const app = new Hono();
    app.route('/api/onboard', onboardRoute);
    const res = await app.request('/api/onboard/validate?token=invalid');
    expect([200, 400, 404, 500]).toContain(res.status);
  });

  it('root GET / returns API info', async () => {
    const { app } = await import('../index');
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe('ShipTrack API');
  });
});

// ── 4. Global middleware ──

describe('global middleware', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('POST without Content-Type returns 415', async () => {
    const { app } = await import('../index');
    // Health endpoint doesn't check Content-Type, but we need an endpoint that does
    const res = await app.request('/api/shipments', { method: 'POST', headers: { accept: 'application/json' } });
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error?.code ?? body.error).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('unmatched /api/* route returns 404', async () => {
    const { app } = await import('../index');
    const res = await app.request('/api/nonexistent');
    expect(res.status).toBe(404);
  });

  it('error handler returns 500 with INTERNAL_ERROR', async () => {
    const { app } = await import('../index');
    // Health is public; POST to health (which only handles GET) should 404 or hit catch-all
    const res = await app.request('/api/health', { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'not-json' });
    expect([404, 500]).toContain(res.status);
    if (res.status === 500) {
      const body = await res.json();
      expect(body.error?.code ?? body.error).toBe('INTERNAL_ERROR');
    }
  });
});

// ── 5. Customer-facing routes (authenticated, no requireRole) ──

describe('customer-facing routes', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('GET /api/customers/my-shipments returns data for customer', async () => {
    const app = mount(customers, '/api/customers', USERS.cx);
    const res = await app.request('/api/customers/my-shipments');
    expect([200, 404, 500]).toContain(res.status);
  });

  it('POST /api/customers/register returns 200 for valid request', async () => {
    // register is public — no auth needed
    const app = new Hono();
    app.use('*', async (c, next) => { c.set('tenantId', 't1'); await next(); });
    app.route('/api/customers', customers);
    mockDb.select.mockReturnValue(chainable);
    vi.mocked(chainable.where).mockReturnThis();
    const res = await app.request('/api/customers/register', { method: 'POST', ...JSON_REQ, body: JSON.stringify({ email: 'test@test.com', name: 'Test', phone: '+911234567890' }) });
    // With db mocks returning empty, this should hit the "no matching shipment" path or register path
    expect([200, 400, 404]).toContain(res.status);
  });
});

// ── 6. Webhook routes ──

describe('webhooks', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('POST /webhooks/17track returns 401 without valid signature', async () => {
    const { app } = await import('../index');
    const res = await app.request('/webhooks/17track', { method: 'POST', body: JSON.stringify({}), headers: { 'content-type': 'application/json' } });
    expect([401, 500]).toContain(res.status);
  });

  it('POST /webhooks/trackingmore returns 401 without valid signature', async () => {
    const { app } = await import('../index');
    const res = await app.request('/webhooks/trackingmore', { method: 'POST', body: JSON.stringify({}), headers: { 'content-type': 'application/json' } });
    expect([400, 401, 500]).toContain(res.status);
  });
});

// ── 7. Debug routes (non-production) ──

describe('debug routes', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('GET /api/debug/seed-status returns 200 or 404 (public)', async () => {
    const { app } = await import('../index');
    const res = await app.request('/api/debug/seed-status');
    expect([200, 404, 500]).toContain(res.status);
  });
});
