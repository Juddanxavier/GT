import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Mocks ----
// vi.mock() calls are hoisted above all code, so we must use vi.hoisted()
// for any variables they reference.
const mockSelectHook = vi.hoisted(() => vi.fn());
const fromMockHook = vi.hoisted(() => vi.fn());

vi.mock('../db', () => ({
  db: {
    select: mockSelectHook,
  },
}));

vi.mock('../db/schema', () => ({
  auditLogs: {
    id: 'audit_log.id',
    event: 'audit_log.event',
    userId: 'audit_log.user_id',
    metadata: 'audit_log.metadata',
    ipAddress: 'audit_log.ip_address',
    userAgent: 'audit_log.user_agent',
    createdAt: 'audit_log.created_at',
  },
  user: {
    id: 'user.id',
    tenantId: 'user.tenant_id',
  },
}));

vi.mock('../middleware/authorization', () => ({
  requireRole: (..._roles: string[]) => {
    return async (c: any, next: () => Promise<void>) => {
      c.set('user', { id: 'admin-1', role: 'superadmin' });
      await next();
    };
  },
  requireBranchScope: () => {
    return async (_c: any, next: () => Promise<void>) => {
      await next();
    };
  },
  getQueryScope: (_c: any) => {
    return { tenantId: 'tenant-1' };
  },
}));

// ---- Import the route module (after mocks) ----
import auditLogsApp from './audit-logs';

function createTestApp() {
  const { Hono } = require('hono');
  const app = new Hono();
  app.route('/api/audit-logs', auditLogsApp);
  return app;
}

/**
 * Set up mock chain for list/timeline/export endpoints.
 * Handles two query patterns:
 * - List/Timeline: count query (select → from → where) + data query (select → from → where → orderBy → limit → offset)
 * - Export: single data query (select → from → where → orderBy → limit)
 *
 * The trick: make the `where` level BOTH thenable (for count queries that end there)
 * AND have .orderBy() (for data queries that continue chaining).
 * Similarly, make the `limit` level both thenable (for export) AND have .offset() (for list).
 */
function mockListQuery(returnValue: unknown[]) {
  const dataResult = Promise.resolve(returnValue);
  const countResult = Promise.resolve([{ count: returnValue.length }]);

  // Track how many db.select() calls we've seen
  let callCount = 0;

  // limit level: thenable (for export ending at .limit()) AND has .offset() (for list/timeline)
  const limitLevel = vi.fn(() => {
    const thenable: any = Promise.resolve(returnValue);
    thenable.offset = vi.fn(() => dataResult);
    return thenable;
  });

  // orderBy level: returns { limit: limitLevel }
  const orderByLevel = vi.fn(() => ({
    limit: limitLevel,
  }));

  // where level: thenable for count, chainable for data
  const whereLevel = vi.fn(() => {
    callCount++;
    if (callCount === 1) {
      // First call: could be count-only (list/timeline) OR data-only (export).
      // Return a thenable with .orderBy so both paths work.
      const thenable: any = countResult;
      thenable.orderBy = orderByLevel;
      return thenable;
    }
    // Second call: data query for list/timeline
    return {
      orderBy: orderByLevel,
    };
  });

  fromMockHook.mockReset();
  fromMockHook.mockReturnValue({ where: whereLevel });

  mockSelectHook.mockReset();
  mockSelectHook.mockReturnValue({ from: fromMockHook });
}

/**
 * Set up mock chain for the events endpoint: select → from → where → groupBy → orderBy
 */
function mockEventsQuery(returnValue: { event: string }[]) {
  const orderByMock = vi.fn(() => Promise.resolve(returnValue));
  const groupByMock = vi.fn(() => ({ orderBy: orderByMock }));
  const whereMock = vi.fn(() => ({ groupBy: groupByMock }));

  fromMockHook.mockReset();
  fromMockHook.mockReturnValue({ where: whereMock });

  mockSelectHook.mockReset();
  mockSelectHook.mockReturnValue({ from: fromMockHook });
}

const mockEntry = (overrides: Record<string, unknown> = {}) => ({
  id: 'audit-1',
  event: 'LOGIN_SUCCESS',
  userId: 'user-1',
  metadata: { email: 'admin@test.com' },
  ipAddress: '203.0.113.42',
  userAgent: 'TestAgent/1.0',
  createdAt: '2026-06-01T12:00:00.000Z',
  ...overrides,
});

const mockEntries = [
  mockEntry({ id: 'audit-1', event: 'LOGIN_SUCCESS', createdAt: '2026-06-01T12:00:00.000Z' }),
  mockEntry({ id: 'audit-2', event: 'USER_CREATED', userId: null, createdAt: '2026-06-02T12:00:00.000Z' }),
  mockEntry({ id: 'audit-3', event: 'NOTIFICATION_SENT', userId: 'user-2', ipAddress: null, createdAt: '2026-06-03T12:00:00.000Z' }),
];

describe('Audit Log Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/audit-logs', () => {
    it('returns paginated audit log entries', async () => {
      mockListQuery(mockEntries);

      const app = createTestApp();
      const res = await app.request('/api/audit-logs?page=1&limit=10');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toHaveLength(3);
      expect(body.total).toBe(3);
      expect(body.page).toBe(1);
      expect(body.limit).toBe(10);
    });

    it('filters by event type', async () => {
      mockListQuery([mockEntries[0]!]);

      const app = createTestApp();
      const res = await app.request('/api/audit-logs?event=LOGIN_SUCCESS');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0]?.event).toBe('LOGIN_SUCCESS');
    });

    it('filters by search query', async () => {
      mockListQuery([mockEntries[0]!]);

      const app = createTestApp();
      const res = await app.request('/api/audit-logs?search=admin');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toHaveLength(1);
    });

    it('filters by date range', async () => {
      mockListQuery([mockEntries[0]!]);

      const app = createTestApp();
      const res = await app.request('/api/audit-logs?start=2026-06-01&end=2026-06-01');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toHaveLength(1);
    });

    it('filters by userId', async () => {
      mockListQuery([mockEntries[0]!]);

      const app = createTestApp();
      const res = await app.request('/api/audit-logs?userId=user-1');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toHaveLength(1);
    });

    it('handles empty results', async () => {
      mockListQuery([]);

      const app = createTestApp();
      const res = await app.request('/api/audit-logs');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toHaveLength(0);
      expect(body.total).toBe(0);
    });

    it('enforces pagination limits (max 100)', async () => {
      mockListQuery(mockEntries);

      const app = createTestApp();
      const res = await app.request('/api/audit-logs?limit=999');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.limit).toBeLessThanOrEqual(100);
    });
  });

  describe('GET /api/audit-logs/events', () => {
    it('returns distinct event types', async () => {
      const distinctEvents = [
        { event: 'BRANCH_CREATED' },
        { event: 'INVOICE_CREATED' },
        { event: 'LOGIN_FAILED' },
        { event: 'LOGIN_SUCCESS' },
        { event: 'USER_CREATED' },
      ];

      mockEventsQuery(distinctEvents);

      const app = createTestApp();
      const res = await app.request('/api/audit-logs/events');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toEqual([
        'BRANCH_CREATED', 'INVOICE_CREATED', 'LOGIN_FAILED', 'LOGIN_SUCCESS', 'USER_CREATED',
      ]);
    });
  });

  describe('GET /api/audit-logs/timeline', () => {
    it('returns grouped timeline events', async () => {
      const timelineEntries = [
        mockEntry({
          id: 'audit-s1',
          event: 'SHIPMENT_DELETED',
          userId: 'admin-1',
          metadata: { shipmentId: 'ship-1', trackingNo: 'TRACK001' },
          createdAt: '2026-06-01T12:00:00.000Z',
        }),
        mockEntry({
          id: 'audit-u1',
          event: 'USER_CREATED',
          userId: 'admin-1',
          metadata: { email: 'newuser@test.com' },
          createdAt: '2026-06-02T12:00:00.000Z',
        }),
      ];

      mockListQuery(timelineEntries);

      const app = createTestApp();
      const res = await app.request('/api/audit-logs/timeline');
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.groups).toBeDefined();
      expect(body.total).toBe(2);
    });
  });

  describe('GET /api/audit-logs/export', () => {
    it('returns CSV with correct headers', async () => {
      mockListQuery(mockEntries);

      const app = createTestApp();
      const res = await app.request('/api/audit-logs/export');
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('text/csv');
      expect(res.headers.get('Content-Disposition')).toContain('attachment');
      expect(res.headers.get('Content-Disposition')).toContain('.csv');
    });

    it('returns CSV body with header row and data rows', async () => {
      mockListQuery(mockEntries);

      const app = createTestApp();
      const res = await app.request('/api/audit-logs/export');
      const csv = await res.text();

      // Should start with BOM
      expect(csv.charCodeAt(0)).toBe(0xFEFF);

      // Should have header row
      expect(csv).toContain('Time,Event,User ID,Details,IP Address,User Agent');

      // Should contain all entries
      expect(csv).toContain('LOGIN_SUCCESS');
      expect(csv).toContain('USER_CREATED');
      expect(csv).toContain('NOTIFICATION_SENT');
    });

    it('applies the same filters as the list endpoint', async () => {
      mockListQuery([mockEntries[0]!]);

      const app = createTestApp();
      const res = await app.request('/api/audit-logs/export?event=LOGIN_SUCCESS');
      expect(res.status).toBe(200);

      const csv = await res.text();
      expect(csv).toContain('LOGIN_SUCCESS');
      expect(csv).not.toContain('USER_CREATED');
    });

    it('handles empty results in export', async () => {
      mockListQuery([]);

      const app = createTestApp();
      const res = await app.request('/api/audit-logs/export');
      expect(res.status).toBe(200);

      const csv = await res.text();
      // Should have BOM + header only (no data rows)
      expect(csv.split('\n').filter(Boolean)).toHaveLength(1); // header only
    });

    it('escapes CSV fields correctly', async () => {
      const entryWithSpecialChars = mockEntry({
        event: 'USER_UPDATED',
        metadata: {
          changes: {
            name: { from: 'Old, Name', to: 'New "Name"' },
          },
          email: 'test@test.com',
        },
      });

      mockListQuery([entryWithSpecialChars]);

      const app = createTestApp();
      const res = await app.request('/api/audit-logs/export');
      const csv = await res.text();

      // Should have proper CSV escaping for quotes
      expect(csv).toContain('"');
      // Should contain the email from metadata
      expect(csv).toContain('email:test@test.com');
    });
  });
});
