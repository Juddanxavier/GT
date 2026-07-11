import { buildEmailHtml } from '@repo/auth-config';
import { eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { withCache } from '../cache';
import { db } from '../db';
import { tenants } from '../db/schema';
import { sendEmail } from '../email/provider';
import { generateReportPdf } from '../invoice/report-service';
import { getQueryScope, requireRole } from '../middleware/authorization';
import { logAudit } from '../services/audit';
import { errorResponse } from '../error-response';
import { reportQuerySchema } from '../validators';
import type { AppVariables } from './types';

const app = new Hono<{ Variables: AppVariables }>();

const ALLOWED_COLUMNS = new Set(['created_at', 's.created_at', 'q.created_at']);

function dateFilter(col: string, start?: string, end?: string) {
  if (!ALLOWED_COLUMNS.has(col)) throw new Error(`Invalid column: ${col}`);
  if (start && end)
    return sql`${sql.raw(col)} >= ${start}::date AND ${sql.raw(col)} < (${end}::date + INTERVAL '1 day')`;
  if (start) return sql`${sql.raw(col)} >= ${start}::date`;
  if (end) return sql`${sql.raw(col)} < (${end}::date + INTERVAL '1 day')`;
  return sql`TRUE`;
}

function clampEnd(end?: string): string | undefined {
  if (!end) return;
  const d = new Date(end);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return d > today ? today.toISOString().slice(0, 10) : end;
}

function scopeFilters(scope: { tenantId?: string; branchId?: string }) {
  const tFilter = scope.tenantId ? sql`tenant_id = ${scope.tenantId}` : sql`TRUE`;
  const sFilter = scope.tenantId ? sql`s.tenant_id = ${scope.tenantId}` : sql`TRUE`;
  const qFilter = scope.tenantId ? sql`q.tenant_id = ${scope.tenantId}` : sql`TRUE`;
  const bFilter = scope.branchId ? sql`branch_id = ${scope.branchId}` : sql`TRUE`;
  const sbFilter = scope.branchId ? sql`s.branch_id = ${scope.branchId}` : sql`TRUE`;
  const qbFilter = scope.branchId ? sql`q.branch_id = ${scope.branchId}` : sql`TRUE`;
  return { tFilter, sFilter, qFilter, bFilter, sbFilter, qbFilter };
}

// Shipment aggregate
app.get('/shipments', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const scope = getQueryScope(c);
  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);
  const start = c.req.query('start');
  const end = clampEnd(c.req.query('end'));
  const cacheKey = `reports:shipments:${scope.branchId ?? 'all'}:${start ?? ''}:${end ?? ''}`;

  const data = await withCache(
    scope.tenantId,
    cacheKey,
    async () => {
      const dFilter = dateFilter('created_at', start, end);
      const sdFilter = dateFilter('s.created_at', start, end);
      const { tFilter, sFilter, bFilter, sbFilter } = scopeFilters(scope);

      const [summary] = await db.execute<Record<string, unknown>>(
        sql`SELECT COUNT(*)::int AS total, COALESCE(SUM(CASE WHEN status='delivered' THEN 1 ELSE 0 END),0)::int AS delivered, COALESCE(SUM(CASE WHEN status='in_transit' THEN 1 ELSE 0 END),0)::int AS in_transit, COALESCE(SUM(CASE WHEN status IN ('exception','failed_attempt') THEN 1 ELSE 0 END),0)::int AS exceptions FROM shipment WHERE ${tFilter} AND ${bFilter} AND ${dFilter}`,
      );

      const [rev] = await db.execute<Record<string, unknown>>(
        sql`SELECT COALESCE(SUM(amount),0)::numeric(12,2) AS total FROM invoice WHERE ${tFilter} AND ${bFilter} AND ${dFilter}`,
      );

      const [statusRaw] = await db.execute<Record<string, unknown>>(
        sql`SELECT COALESCE(json_agg(json_build_object('status', status, 'count', c) ORDER BY c DESC),'[]'::json) AS val FROM (SELECT status, COUNT(*)::int AS c FROM shipment WHERE ${tFilter} AND ${bFilter} AND ${dFilter} GROUP BY status) sub`,
      );

      const [brRaw] = await db.execute<Record<string, unknown>>(
        sql`SELECT COALESCE(json_agg(json_build_object('name', n, 'count', c) ORDER BY c DESC),'[]'::json) AS val FROM (SELECT COALESCE(b.name, 'Unassigned') AS n, COUNT(*)::int AS c FROM shipment s LEFT JOIN branch b ON b.id = s.branch_id WHERE ${sFilter} AND ${sbFilter} AND ${sdFilter} GROUP BY n ORDER BY c DESC) sub`,
      );

      return {
        summary: summary ?? { total: 0, delivered: 0, in_transit: 0, exceptions: 0 },
        revenue: (rev?.total as string) ?? '0',
        statusDistribution: (statusRaw?.val as { status: string; count: number }[]) ?? [],
        branchComparison: (brRaw?.val as { name: string; count: number }[]) ?? [],
      };
    },
    300,
  );

  return c.json({ data });
});

// Quotation aggregate
app.get('/quotations', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const scope = getQueryScope(c);
  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);
  const start = c.req.query('start');
  const end = clampEnd(c.req.query('end'));
  const cacheKey = `reports:quotations:${scope.branchId ?? 'all'}:${start ?? ''}:${end ?? ''}`;

  const data = await withCache(
    scope.tenantId,
    cacheKey,
    async () => {
      const dFilter = dateFilter('created_at', start, end);
      const qdFilter = dateFilter('q.created_at', start, end);
      const { tFilter, qFilter, bFilter, qbFilter } = scopeFilters(scope);

      const [summary] = await db.execute<Record<string, unknown>>(
        sql`SELECT COUNT(*)::int AS total, COALESCE(SUM(CASE WHEN status='accepted' THEN 1 ELSE 0 END),0)::int AS accepted, COALESCE(SUM(CASE WHEN status='converted' THEN 1 ELSE 0 END),0)::int AS converted, COALESCE(SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END),0)::int AS rejected FROM quotation WHERE ${tFilter} AND ${bFilter} AND ${dFilter}`,
      );

      const [funnelRaw] = await db.execute<Record<string, unknown>>(
        sql`SELECT COALESCE(json_agg(json_build_object('status', status, 'count', c) ORDER BY c DESC),'[]'::json) AS val FROM (SELECT status, COUNT(*)::int AS c FROM quotation WHERE ${tFilter} AND ${bFilter} AND ${dFilter} GROUP BY status) sub`,
      );

      const [custRaw] = await db.execute<Record<string, unknown>>(
        sql`SELECT COALESCE(json_agg(json_build_object('name', n, 'count', c) ORDER BY c DESC),'[]'::json) AS val FROM (SELECT COALESCE(u.name, 'Unknown') AS n, COUNT(*)::int AS c FROM quotation q LEFT JOIN "user" u ON u.id = q.user_id WHERE ${qFilter} AND ${qbFilter} AND ${qdFilter} GROUP BY n ORDER BY c DESC LIMIT 10) sub`,
      );

      const [monthlyRaw] = await db.execute<Record<string, unknown>>(
        sql`SELECT COALESCE(json_agg(json_build_object('month', m, 'count', c) ORDER BY m),'[]'::json) AS val FROM (SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS m, COUNT(*)::int AS c FROM quotation WHERE ${tFilter} AND ${bFilter} AND ${dFilter} GROUP BY DATE_TRUNC('month', created_at)) sub`,
      );

      return {
        summary: summary ?? { total: 0, accepted: 0, converted: 0, rejected: 0 },
        funnel: (funnelRaw?.val as { status: string; count: number }[]) ?? [],
        topCustomers: (custRaw?.val as { name: string; count: number }[]) ?? [],
        monthlyVolume: (monthlyRaw?.val as { month: string; count: number }[]) ?? [],
      };
    },
    300,
  );

  return c.json({ data });
});

// Shipment records (paginated)
app.get('/shipments/data', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const scope = getQueryScope(c);
  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);
  const start = c.req.query('start');
  const end = clampEnd(c.req.query('end'));
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') ?? '50', 10) || 50, 1), 200);
  const offset = Math.max(parseInt(c.req.query('offset') ?? '0', 10) || 0, 0);
  const cacheKey = `reports:shipments-data:${scope.branchId ?? 'all'}:${start ?? ''}:${end ?? ''}:${limit}:${offset}`;

  const result = await withCache(
    scope.tenantId,
    cacheKey,
    async () => {
      const sdFilter = dateFilter('s.created_at', start, end);
      const { sFilter, sbFilter } = scopeFilters(scope);

      const [countResult] = await db.execute<Record<string, unknown>>(
        sql`SELECT COUNT(*)::int AS total FROM shipment WHERE ${scopeFilters(scope).tFilter} AND ${scopeFilters(scope).bFilter} AND ${dateFilter('created_at', start, end)}`,
      );
      const total = (countResult?.total as number) ?? 0;

      const rows = await db.execute<Record<string, unknown>>(
        sql`SELECT s.id, s.tracking_no, s.status, s.origin, s.destination, s.carrier, s.created_at, COALESCE(u.name, '') AS customer_name, COALESCE(u.phone, '') AS customer_phone, COALESCE(u.email, '') AS customer_email, COALESCE(b.name, '') AS branch_name FROM shipment s LEFT JOIN "user" u ON u.id = s.user_id LEFT JOIN branch b ON b.id = s.branch_id WHERE ${sFilter} AND ${sbFilter} AND ${sdFilter} ORDER BY s.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      );

      return { rows, total };
    },
    300,
  );

  return c.json({ data: result });
});

// Quotation records (paginated)
app.get('/quotations/data', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const scope = getQueryScope(c);
  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);
  const start = c.req.query('start');
  const end = clampEnd(c.req.query('end'));
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') ?? '50', 10) || 50, 1), 200);
  const offset = Math.max(parseInt(c.req.query('offset') ?? '0', 10) || 0, 0);
  const cacheKey = `reports:quotations-data:${scope.branchId ?? 'all'}:${start ?? ''}:${end ?? ''}:${limit}:${offset}`;

  const result = await withCache(
    scope.tenantId,
    cacheKey,
    async () => {
      const qdFilter = dateFilter('q.created_at', start, end);
      const { qFilter, qbFilter } = scopeFilters(scope);

      const [countResult] = await db.execute<Record<string, unknown>>(
        sql`SELECT COUNT(*)::int AS total FROM quotation WHERE ${scopeFilters(scope).tFilter} AND ${scopeFilters(scope).bFilter} AND ${dateFilter('created_at', start, end)}`,
      );
      const total = (countResult?.total as number) ?? 0;

      const rows = await db.execute<Record<string, unknown>>(
        sql`SELECT q.id, q.quote_no, q.status, q.total, q.valid_until, q.created_at, COALESCE(u.name, '') AS customer_name FROM quotation q LEFT JOIN "user" u ON u.id = q.user_id WHERE ${qFilter} AND ${qbFilter} AND ${qdFilter} ORDER BY q.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      );

      return { rows, total };
    },
    300,
  );

  return c.json({ data: result });
});

// Generate PDF
app.post('/pdf', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const scope = getQueryScope(c);
  if (!scope.tenantId) return errorResponse(c, 'TENANT_REQUIRED', 'Tenant required', 400);
  const parsed = reportQuerySchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join(', '), 400);
  const body = parsed.data!;
  const { tFilter, bFilter, sFilter, sbFilter, qFilter, qbFilter } = scopeFilters(scope);

  let tenantData: { name: string; currency: string | null } | undefined;
  if (scope.tenantId) {
    const [t] = await db
      .select({ name: tenants.name, currency: tenants.currency })
      .from(tenants)
      .where(eq(tenants.id, scope.tenantId))
      .limit(1);
    if (t) tenantData = t;
  }

  try {
    const pdf = await generateReportPdf({
      tenantFilter: tFilter,
      branchFilter: bFilter,
      sFilter,
      sbFilter,
      qFilter,
      qbFilter,
      type: body.type ?? 'shipments',
      startDate: body.startDate,
      endDate: body.endDate,
      tenantName: tenantData?.name,
      currency: tenantData?.currency ?? undefined,
    });
    return new Response(pdf as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${body.type ?? 'shipments'}-report-${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (err) {
    console.error('[reports/pdf]', err);
    return errorResponse(c, 'REPORT_ERROR', 'Failed to generate report', 500);
  }
});

// Send PDF via email
app.post('/send-email', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const scope = getQueryScope(c);
  if (!scope.tenantId) return errorResponse(c, 'TENANT_REQUIRED', 'Tenant required', 400);
  const parsed = reportQuerySchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join(', '), 400);
  const body = parsed.data!;
  const user = c.get('user') as Record<string, unknown> | undefined;
  if (!user?.email) return errorResponse(c, 'NO_EMAIL', 'No email on your account', 400);

  const { tFilter, bFilter, sFilter, sbFilter, qFilter, qbFilter } = scopeFilters(scope);
  const startDate = clampEnd(body.startDate);
  const endDate = clampEnd(body.endDate);

  let tData: { name: string; currency: string | null } | undefined;
  if (scope.tenantId) {
    const [t] = await db
      .select({ name: tenants.name, currency: tenants.currency })
      .from(tenants)
      .where(eq(tenants.id, scope.tenantId))
      .limit(1);
    if (t) tData = t;
  }

  try {
    const pdf = await generateReportPdf({
      tenantFilter: tFilter,
      branchFilter: bFilter,
      sFilter,
      sbFilter,
      qFilter,
      qbFilter,
      type: body.type ?? 'shipments',
      startDate,
      endDate,
      tenantName: tData?.name,
      currency: tData?.currency ?? undefined,
    });

    const type = body.type === 'quotations' ? 'Quotation' : 'Shipment';
    const dateLabel = [startDate, endDate].filter(Boolean).join(' – ') || 'All time';

    await sendEmail({
      to: user.email as string,
      subject: `${type} Report — ${dateLabel}`,
      html: buildEmailHtml({
        title: `${type} Report`,
        bodyHtml: `<p style="font-size:14px;line-height:1.6;color:#374151">Hi ${(user.name as string) || 'there'},</p>
<p style="font-size:14px;line-height:1.6;color:#374151">Your requested ${type.toLowerCase()} report for <strong>${dateLabel}</strong> is ready and attached as a PDF.</p>`,
      }),
      attachments: [
        {
          filename: `${type.toLowerCase()}-report-${new Date().toISOString().slice(0, 10)}.pdf`,
          content: pdf as unknown as Buffer,
          contentType: 'application/pdf',
        },
      ],
    });

    await logAudit('NOTIFICATION_SENT', (user.id as string) ?? null, {
      channel: 'email',
      type: 'report',
      reportType: body.type ?? 'shipments',
      recipient: user.email as string,
      dateRange: dateLabel,
      tenantId: scope.tenantId,
    }, c);

    return c.json({ data: { sent: true } });
  } catch (err) {
    console.error('[reports/send-email]', err);
    return c.json({ error: 'Failed to send report email' }, 500);
  }
});

export default app;
