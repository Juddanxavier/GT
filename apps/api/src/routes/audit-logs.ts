/** @format */

import { and, desc, eq, like, type SQL, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../db';
import { auditLogs } from '../db/schema';
import { getQueryScope, requireBranchScope, requireRole } from '../middleware/authorization';
import type { AppVariables } from './types';

const app = new Hono<{ Variables: AppVariables }>();

/**
 * Scope audit logs by tenant using the dedicated tenantId column.
 * This is far more efficient than the previous approach of joining
 * through the user table with a subquery.
 */
function applyTenantScope(conditions: (ReturnType<typeof eq | typeof like> | SQL)[], tenantId: string | undefined) {
  if (tenantId) {
    conditions.push(eq(auditLogs.tenantId, tenantId));
  }
}

/**
 * Extract entity info from an audit event's metadata for timeline grouping.
 * Returns the group key, type, and display label.
 */
function getEntityKey(event: string, meta: Record<string, unknown>): {
  key: string;
  type: string;
  label: string;
} {
  // Shipment events
  if (meta.shipmentId) {
    const trackingNo = (meta.trackingNo as string) ?? (meta.shipmentId as string).slice(0, 8);
    return { key: `shipment:${meta.shipmentId}`, type: 'shipment', label: `Shipment ${trackingNo}` };
  }

  // Invoice events
  if (meta.invoiceId) {
    const invoiceNo = (meta.invoiceNo as string) ?? (meta.invoiceId as string).slice(0, 8);
    return { key: `invoice:${meta.invoiceId}`, type: 'invoice', label: `Invoice ${invoiceNo}` };
  }

  // User events
  if (event.startsWith('USER_') || event.startsWith('PASSWORD_') || event === 'LOGIN_SUCCESS' || event === 'LOGIN_FAILED' || event === 'LOGIN_BLOCKED') {
    const email = (meta.email as string) ?? (meta.recipient as string) ?? 'unknown';
    const userId = meta.userId as string | undefined;
    return { key: `user:${userId ?? email}`, type: 'user', label: `User ${email}` };
  }

  // Invitation events
  if (event.startsWith('INVITATION_')) {
    const email = (meta.email as string) ?? 'unknown';
    const id = (meta.id as string) ?? email;
    return { key: `invitation:${id}`, type: 'invitation', label: `Invitation ${email}` };
  }

  // Notification events
  if (event.startsWith('NOTIFICATION_')) {
    const recipient = (meta.recipient as string) ?? (meta.email as string) ?? (meta.type as string) ?? event;
    return { key: `notification:${recipient}`, type: 'notification', label: `Notification ${recipient}` };
  }

  // Branch events
  if (event.startsWith('BRANCH_')) {
    const name = (meta.name as string) ?? (meta.branchId as string)?.slice(0, 8) ?? 'unknown';
    return { key: `branch:${meta.branchId ?? event}`, type: 'branch', label: `Branch ${name}` };
  }

  // Quotation events
  if (event.startsWith('QUOTATION_')) {
    const id = (meta.quotationId as string) ?? (meta.quoteNo as string) ?? 'unknown';
    return { key: `quotation:${meta.quotationId ?? event}`, type: 'quotation', label: `Quotation #${id}` };
  }

  // Fallback: group by event type + user
  const userId = meta.userId as string | undefined;
  const email = (meta.email as string) ?? (meta.recipient as string) ?? '';
  const suffix = userId ?? email ?? '';
  return {
    key: `other:${event}:${suffix}`,
    type: 'other',
    label: event.replace(/_/g, ' '),
  };
}

app.get(
  '/',
  requireRole('superadmin', 'tenant-admin'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);

    const event = c.req.query('event');
    const userId = c.req.query('userId');
    const search = c.req.query('search');
    const startDate = c.req.query('start');
    const endDate = c.req.query('end');
    const page = Math.max(1, Number(c.req.query('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(c.req.query('limit')) || 50));
    const offset = (page - 1) * limit;

    const conditions: (ReturnType<typeof eq | typeof like> | SQL)[] = [];

    applyTenantScope(conditions, scope.tenantId);

    if (event) conditions.push(eq(auditLogs.event, event!));
    if (userId) conditions.push(eq(auditLogs.userId, userId!));

    if (search) {
      const q = `%${search}%`;
      conditions.push(
        sql`(${like(auditLogs.event, q)} OR ${sql`${auditLogs.metadata}::text ILIKE ${q}`} OR ${like(auditLogs.userId, q)})`,
      );
    }

    if (startDate) {
      conditions.push(sql`${auditLogs.createdAt} >= ${startDate}::timestamptz`);
    }
    if (endDate) {
      conditions.push(sql`${auditLogs.createdAt} <= ${endDate}::timestamptz + interval '1 day'`);
    }

    const [countRow] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(auditLogs)
      .where(and(...conditions) as SQL | undefined);

    const total = countRow?.count ?? 0;

    const rows = await db
      .select({
        id: auditLogs.id,
        event: auditLogs.event,
        userId: auditLogs.userId,
        metadata: auditLogs.metadata,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(and(...conditions) as SQL | undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({
      data: rows,
      total,
      page,
      limit,
    });
  },
);

/**
 * Timeline view: returns audit events grouped by related entity.
 * Groups events that share a common entity (shipment, invoice, user, etc.)
 * and returns them in chronological order within each group.
 */
app.get(
  '/timeline',
  requireRole('superadmin', 'tenant-admin'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);

    const event = c.req.query('event');
    const userId = c.req.query('userId');
    const search = c.req.query('search');
    const startDate = c.req.query('start');
    const endDate = c.req.query('end');
    const page = Math.max(1, Number(c.req.query('page')) || 1);
    const limit = Math.min(200, Math.max(1, Number(c.req.query('limit')) || 100));
    const offset = (page - 1) * limit;

    const conditions: (ReturnType<typeof eq | typeof like> | SQL)[] = [];

    applyTenantScope(conditions, scope.tenantId);

    if (event) conditions.push(eq(auditLogs.event, event!));
    if (userId) conditions.push(eq(auditLogs.userId, userId!));

    if (search) {
      const q = `%${search}%`;
      conditions.push(
        sql`(${like(auditLogs.event, q)} OR ${sql`${auditLogs.metadata}::text ILIKE ${q}`} OR ${like(auditLogs.userId, q)})`,
      );
    }

    if (startDate) {
      conditions.push(sql`${auditLogs.createdAt} >= ${startDate}::timestamptz`);
    }
    if (endDate) {
      conditions.push(sql`${auditLogs.createdAt} <= ${endDate}::timestamptz + interval '1 day'`);
    }

    const [countRow] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(auditLogs)
      .where(and(...conditions) as SQL | undefined);

    const total = countRow?.count ?? 0;

    const rows = await db
      .select({
        id: auditLogs.id,
        event: auditLogs.event,
        userId: auditLogs.userId,
        metadata: auditLogs.metadata,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(and(...conditions) as SQL | undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Group events by entity
    const groups = new Map<string, {
      key: string;
      type: string;
      label: string;
      events: typeof rows;
      metadata: Set<string>;
    }>();

    for (const row of rows) {
      const entity = getEntityKey(row.event, row.metadata as Record<string, unknown>);
      const existing = groups.get(entity.key);
      if (existing) {
        existing.events.push(row);
      } else {
        groups.set(entity.key, {
          key: entity.key,
          type: entity.type,
          label: entity.label,
          events: [row],
          metadata: new Set(),
        });
      }
      // Collect unique metadata keys for the group summary
      for (const key of Object.keys(row.metadata as Record<string, unknown>)) {
        const g = groups.get(entity.key)!;
        g.metadata.add(key);
      }
    }

    // Sort: sort groups by their latest event (most recent first)
    const sortedGroups = Array.from(groups.values())
      .map((g) => ({
        ...g,
        events: g.events.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
      }))
      .sort((a, b) => {
        const aLast = new Date(a.events[a.events.length - 1]!.createdAt).getTime();
        const bLast = new Date(b.events[b.events.length - 1]!.createdAt).getTime();
        return bLast - aLast;
      });

    return c.json({
      groups: sortedGroups.map((g) => ({
        key: g.key,
        type: g.type,
        label: g.label,
        eventCount: g.events.length,
        startTime: g.events[0]!.createdAt,
        endTime: g.events[g.events.length - 1]!.createdAt,
        metadataKeys: Array.from(g.metadata).sort(),
        events: g.events.map((e) => ({
          id: e.id,
          event: e.event,
          userId: e.userId,
          metadata: e.metadata,
          ipAddress: e.ipAddress,
          userAgent: e.userAgent,
          createdAt: e.createdAt,
        })),
      })),
      total,
      page,
      limit,
    });
  },
);

// Get distinct audit event types (for the filter dropdown)
app.get(
  '/events',
  requireRole('superadmin', 'tenant-admin'),
  async (c) => {
    const scope = getQueryScope(c);

    const conditions: (ReturnType<typeof eq | typeof like> | SQL)[] = [];
    applyTenantScope(conditions, scope.tenantId);

    const rows = await db
      .select({ event: auditLogs.event })
      .from(auditLogs)
      .where(and(...conditions) as SQL | undefined)
      .groupBy(auditLogs.event)
      .orderBy(auditLogs.event);

    return c.json({ data: rows.map((r) => r.event) });
  },
);

/**
 * Export audit logs as CSV.
 * Accepts the same filter params as the list endpoint but returns all matching results
 * (up to 10,000 rows) as a downloadable CSV file.
 */
app.get(
  '/export',
  requireRole('superadmin', 'tenant-admin'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);

    const event = c.req.query('event');
    const search = c.req.query('search');
    const startDate = c.req.query('start');
    const endDate = c.req.query('end');
    const limit = 10000;

    const conditions: (ReturnType<typeof eq | typeof like> | SQL)[] = [];

    applyTenantScope(conditions, scope.tenantId);

    if (event) conditions.push(eq(auditLogs.event, event!));

    if (search) {
      const q = `%${search}%`;
      conditions.push(
        sql`(${like(auditLogs.event, q)} OR ${sql`${auditLogs.metadata}::text ILIKE ${q}`} OR ${like(auditLogs.userId, q)})`,
      );
    }

    if (startDate) {
      conditions.push(sql`${auditLogs.createdAt} >= ${startDate}::timestamptz`);
    }
    if (endDate) {
      conditions.push(sql`${auditLogs.createdAt} <= ${endDate}::timestamptz + interval '1 day'`);
    }

    const rows = await db
      .select({
        id: auditLogs.id,
        event: auditLogs.event,
        userId: auditLogs.userId,
        metadata: auditLogs.metadata,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(and(...conditions) as SQL | undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    // Build CSV
    const escapeCsv = (val: unknown): string => {
      const s = val === null || val === undefined ? '' : String(val);
      // Escape double quotes and wrap in quotes if contains comma, quote, or newline
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const flattenMeta = (meta: Record<string, unknown>): string => {
      const parts: string[] = [];
      if (meta.email) parts.push(`email:${meta.email}`);
      if (meta.role) parts.push(`role:${meta.role}`);
      if (meta.changes) {
        const changes = meta.changes as Record<string, { from: unknown; to: unknown }>;
        const changeStrs = Object.entries(changes).map(
          ([k, v]) => `${k}:${String(v.from ?? '')}->${String(v.to ?? '')}`,
        );
        parts.push(changeStrs.join(';'));
      }
      if (meta.reason) parts.push(`reason:${meta.reason}`);
      if (meta.trackingNo) parts.push(`tracking:${meta.trackingNo}`);
      if (meta.invoiceNo) parts.push(`invoice:${meta.invoiceNo}`);
      if (meta.recipient) parts.push(`to:${meta.recipient}`);
      if (meta.shipmentId) parts.push(`shipment:${(meta.shipmentId as string).slice(0, 8)}`);
      if (meta.invoiceId) parts.push(`inv:${(meta.invoiceId as string).slice(0, 8)}`);
      if (meta.branchId) parts.push(`branch:${(meta.branchId as string).slice(0, 8)}`);
      if (meta.count) parts.push(`count:${meta.count}`);
      if (meta.channel) parts.push(`ch:${meta.channel}`);
      if (meta.eventType) parts.push(`evt:${meta.eventType}`);
      if (meta.type && meta.type !== meta.event) parts.push(`type:${meta.type}`);
      return parts.join(' | ');
    };

    const header = 'Time,Event,User ID,Details,IP Address,User Agent\n';
    const body = rows
      .map((r) => {
        const time = r.createdAt
          ? new Date(r.createdAt).toISOString().replace('T', ' ').replace(/\.\d+Z$/, '')
          : '';
        const meta = flattenMeta(r.metadata as Record<string, unknown>);
        return [
          escapeCsv(time),
          escapeCsv(r.event),
          escapeCsv(r.userId),
          escapeCsv(meta),
          escapeCsv(r.ipAddress),
          escapeCsv(r.userAgent),
        ].join(',');
      })
      .join('\n');

    const csv = `\uFEFF${header}${body}`; // BOM prefix for Excel Unicode support

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  },
);

export default app;
