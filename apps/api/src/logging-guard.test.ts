import { describe, it, expect, vi, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The cold import of the real app graph can take several seconds when the
// whole suite runs in parallel; it belongs in the hook, not in a test budget.
vi.setConfig({ testTimeout: 15000, hookTimeout: 60000 });

// ── Logging guard tests (spec 0001, Enforcement) ──
// 1. Request correlation: one known x-request-id through the real app, every
//    line carries the id, exactly one terminal line (AC-2, AC-5, AC-7).
//    This test also guards the never root logger inside request code rule:
//    a route that reaches for the root logger emits a line without reqId and
//    the whole request assertion fails.
// 2. PII masking: the fixture lines the spec fixed (AC-6).

// Capture sink: a real, non silent logger built through createLogger, writing
// every line to memory as JSON.
const lines = vi.hoisted(() => [] as string[]);

vi.mock('./logger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./logger')>();
  const sink = {
    write: (chunk: string) => {
      lines.push(chunk);
    },
  };
  const testLogger = actual.createLogger({ level: 'info', destination: sink });
  return {
    ...actual,
    logger: testLogger,
    childLogger: (bindings: Record<string, unknown>) => testLogger.child(bindings),
  };
});

// Hermetic environment: no real database, no redis, seed secret known.
vi.hoisted(() => {
  process.env.DATABASE_URL = 'postgres://guard:guard@127.0.0.1:9/guard';
  delete process.env.REDIS_URL;
  process.env.SEED_SECRET = 'guard-seed-secret';
});

// ── Hermetic doubles for the app's dependencies ──
// Copy of the proven import set from integration.test.ts, adjusted so that
// selects resolve a tenant row, inserts and execute throw, and the cache reads
// miss. That gives the tenant middleware a deterministic domain resolution.

const chainable = vi.hoisted(() => {
  const rows = [{ tenantId: 'tenant-77' }];
  const q = {
    from: vi.fn(() => q),
    where: vi.fn(() => q),
    limit: vi.fn(() => q),
    orderBy: vi.fn(() => q),
    offset: vi.fn(() => q),
    innerJoin: vi.fn(() => q),
    leftJoin: vi.fn(() => q),
    returning: vi.fn(() => q),
    then: undefined as unknown,
  };
  q.then = vi.fn((resolve: (v: unknown) => unknown) => resolve(rows));
  return q;
});

const mockDb = vi.hoisted(() => ({
  select: vi.fn(() => chainable),
  insert: vi.fn(() => {
    throw new Error('insert exploded');
  }),
  update: vi.fn(() => chainable),
  delete: vi.fn(() => chainable),
  execute: vi.fn(async () => {
    throw new Error('no database available');
  }),
}));
vi.mock('./db', () => ({
  db: mockDb,
  default: mockDb,
  runWithTenantContext: vi.fn(async (_id: string | null, fn: () => unknown) => fn()),
}));

vi.mock('./cache', () => ({
  cacheGet: vi.fn(async () => null),
  cacheSet: vi.fn(async () => {}),
  cacheDel: vi.fn(async () => {}),
  cacheDelPattern: vi.fn(async () => {}),
  cacheFlushTenant: vi.fn(async () => {}),
  withCache: vi.fn((_t: unknown, _k: unknown, fn: () => unknown) => fn()),
}));
vi.mock('./realtime', () => ({ emitToTenant: vi.fn() }));
vi.mock('./services/audit', () => ({ logAudit: vi.fn() }));
vi.mock('./auth', () => ({
  auth: {
    api: {
      createUser: vi.fn(),
      updateUser: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ user: {} }),
      signInEmail: vi.fn().mockResolvedValue({ ok: true }),
      requestPasswordReset: vi.fn(),
    },
    handler: vi.fn(),
  },
}));
vi.mock('./services/archive', () => ({ runArchive: vi.fn() }));
vi.mock('./email/provider', () => ({
  sendEmail: vi.fn(),
  getEmailProviderStatus: vi.fn().mockReturnValue({ configured: false }),
  closeTransport: vi.fn(),
}));
vi.mock('./redis', () => ({
  cacheClient: null,
  connectRedis: vi.fn(),
  disconnectRedis: vi.fn(),
  bullConnectionOptions: null,
  bullConnection: null,
}));
vi.mock('./instrument', () => ({}));
vi.mock('./queues', () => ({
  queues: [],
  notificationQueue: { add: vi.fn(), name: 'notifications' },
  runArchive: vi.fn(),
  isRedisConnected: vi.fn(() => false),
  isRedisConfigured: vi.fn(() => false),
}));
vi.mock('@repo/auth-config', () => ({ buildEmailHtml: vi.fn(() => '<html/>') }));

const mockOtp = vi.hoisted(() => ({
  generateOtp: vi.fn(() => '123456'),
  verifyOtp: vi.fn(() => true),
  maskEmail: vi.fn((e: string) => e!.substring(0, 3) + '***'),
}));
vi.mock('./services/otp', () => mockOtp);
vi.mock('./notifications/event-map', () => ({ statusToEventType: vi.fn(() => 'status_changed') }));
const mockNotifPrefs = vi.hoisted(() => ({ getPreferences: vi.fn(() => ({})), upsertPreferences: vi.fn() }));
vi.mock('./services/notification-prefs', () => mockNotifPrefs);

function parseLines(from: number): Record<string, unknown>[] {
  return lines.slice(from).map((l) => JSON.parse(l) as Record<string, unknown>);
}

describe('request correlation (AC-2, AC-5)', () => {
  beforeAll(async () => {
    await import('./index');
  });

  it('binds every line of a request to its id and emits exactly one terminal line', async () => {
    const { app } = await import('./index');
    const before = lines.length;
    const res = await app.request('http://gajan.test/api/health?token=secret123', {
      headers: { 'x-request-id': 'guard-req-001' },
    });
    const produced = parseLines(before);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toBe('guard-req-001');

    // Every line the request produced carries the id. This also fails if any
    // code in the request path reaches for the root logger: those lines land
    // in the sink without reqId.
    expect(produced.length).toBeGreaterThan(0);
    expect(produced.every((l) => l.reqId === 'guard-req-001')).toBe(true);

    expect(produced.filter((l) => l.msg === 'incoming request')).toHaveLength(1);
    const terminals = produced.filter((l) => l.msg === 'response');
    expect(terminals).toHaveLength(1);

    const incoming = produced.find((l) => l.msg === 'incoming request');
    expect(incoming?.method).toBe('GET');
    expect(incoming?.path).toBe('/api/health'); // path only, never the query string

    // Level by status. Public routes respond before the session and tenant
    // middleware run, so their lines carry reqId only (no tenant resolved).
    expect(terminals[0]?.level).toBe(30);
    expect(terminals[0]?.status).toBe(200);
  });

  it('maps a 4xx terminal line to warn, and carries tenantId once tenant middleware resolved it', async () => {
    const { app } = await import('./index');

    let before = lines.length;
    // An unmatched path runs through the whole chain, including the tenant
    // middleware: the host header resolves the tenant by domain.
    const missing = await app.request('/api/definitely-missing', {
      headers: { 'x-request-id': 'guard-req-002', host: 'gajan.test' },
    });
    const lines404 = parseLines(before);
    expect(missing.status).toBe(404);
    const terminal404 = lines404.filter((l) => l.msg === 'response');
    expect(terminal404).toHaveLength(1);
    expect(terminal404[0]?.level).toBe(40);
    expect(terminal404[0]?.status).toBe(404);
    expect(terminal404[0]?.tenantId).toBe('tenant-77');

    before = lines.length;
    const degraded = await app.request('/api/ready', {
      headers: { 'x-request-id': 'guard-req-003' },
    });
    const lines503 = parseLines(before);
    expect(degraded.status).toBe(503);
    const terminal503 = lines503.filter((l) => l.msg === 'response');
    expect(terminal503).toHaveLength(1);
    expect(terminal503[0]?.level).toBe(50);
    expect(terminal503[0]?.status).toBe(503);
  });

  it('emits the unhandled error line as the single terminal line when a handler throws', async () => {
    const { app } = await import('./index');
    const before = lines.length;
    // The seed route reads the secret, then inserts; the insert mock throws.
    const res = await app.request('/api/seed/tenant', {
      method: 'POST',
      headers: {
        'x-seed-secret': 'guard-seed-secret',
        'content-type': 'application/json',
        'x-request-id': 'guard-req-004',
      },
      body: '{}',
    });
    const produced = parseLines(before);

    expect(res.status).toBe(500);
    // Hono resolves next() after the error handler runs, so the access line
    // stands down: no response line, the unhandled error line is THE line.
    expect(produced.filter((l) => l.msg === 'response')).toHaveLength(0);
    const errorLines = produced.filter((l) => l.msg === 'Unhandled error');
    expect(errorLines).toHaveLength(1);
    expect(errorLines[0]?.level).toBe(50);
    expect(errorLines[0]?.reqId).toBe('guard-req-004');
    expect(produced.every((l) => l.reqId === 'guard-req-004')).toBe(true);
  });

  it('rebinds the request logger with tenantId after tenant resolution (AC-2)', async () => {
    const { runWithTenantContext } = await import('./db');
    vi.mocked(runWithTenantContext).mockRejectedValueOnce(new Error('rls exploded'));
    const { app } = await import('./index');
    const before = lines.length;
    const res = await app.request('/api/definitely-missing', {
      headers: { 'x-request-id': 'guard-req-005', host: 'gajan.test' },
    });
    const produced = parseLines(before);

    expect(res.status).toBe(500);
    const rlsLines = produced.filter((l) => l.msg === 'failed to set RLS context');
    expect(rlsLines).toHaveLength(1);
    // This line is logged with only an err field; tenantId can only come from
    // the rebound child logger, so the binding is proven, not the explicit field.
    expect(rlsLines[0]?.tenantId).toBe('tenant-77');
    expect(rlsLines[0]?.reqId).toBe('guard-req-005');
  });

  it('replaces an invalid inbound id with a fresh UUID (AC-7)', async () => {
    const { app } = await import('./index');
    const res = await app.request('/api/health', {
      headers: { 'x-request-id': 'bad id with spaces!!' },
    });
    const id = res.headers.get('x-request-id');
    expect(id).not.toBe('bad id with spaces!!');
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});

describe('PII masking (AC-6)', () => {
  it('masks emails and both phone shapes while ids and durations stay readable', async () => {
    const { createLogger } = await import('./logger');
    const captured: string[] = [];
    const log = createLogger({
      level: 'info',
      destination: {
        write: (chunk: string) => {
          captured.push(chunk);
        },
      },
    });

    log.info(
      {
        email: 'jane@acme.com',
        e164: '+919876543210',
        sep: '(011) 234 5678',
        spaced: '98765 43210',
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        trackingNo: 'GT-123456789',
        ms: 1234,
      },
      'mail jane@acme.com to +919876543210 or 98765 43210 ms 1234',
    );

    const line = JSON.parse(captured[0] as string) as Record<string, unknown>;
    expect(line.msg).toBe('mail j***@acme.com to +********3210 or ***** *3210 ms 1234');
    expect(line.email).toBe('j***@acme.com');
    expect(line.e164).toBe('+********3210');
    expect(line.sep).toBe('(***) *** 5678');
    expect(line.spaced).toBe('***** *3210');
    expect(line.uuid).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(line.trackingNo).toBe('GT-123456789');
    expect(line.ms).toBe(1234);
  });

  it('is idempotent: a second pass over masked text changes nothing', async () => {
    const { createLogger } = await import('./logger');
    const captured: string[] = [];
    const log = createLogger({
      level: 'info',
      destination: {
        write: (chunk: string) => {
          captured.push(chunk);
        },
      },
    });

    log.info('j***@acme.com +********3210 ***** *3210 (***) *** 5678');
    const line = JSON.parse(captured[0] as string) as Record<string, unknown>;
    expect(line.msg).toBe('j***@acme.com +********3210 ***** *3210 (***) *** 5678');
  });
});

describe('biome enforcement (AC-1)', () => {
  it('scopes noConsole as an error to apps/api outside tests and drizzle, as the last override', () => {
    // The entry is fixed by spec 0001, so this assertion is not circular.
    const biomePath = resolve(process.cwd(), '..', '..', 'biome.json');
    const config = JSON.parse(readFileSync(biomePath, 'utf-8')) as { overrides?: unknown[] };
    const entry = {
      includes: ['apps/api/**/*.ts', '!apps/api/**/*.test.ts', '!apps/api/drizzle/**'],
      linter: { rules: { suspicious: { noConsole: 'error' } } },
    };

    expect(config.overrides).toContainEqual(entry);
    // Last entry: nothing after it can re-enable console for tests.
    expect(config.overrides?.[config.overrides.length - 1]).toEqual(entry);
  });
});
