import { Hono } from 'hono';
import { eq, sql, and } from 'drizzle-orm';
import { db } from '../db';
import { shipments, customers, quotations, invoices, tenants as tenantTable, branches } from '../db/schema';
import { requireRole, getQueryScope } from '../middleware/authorization';
import { withCache } from '../cache';
import type { AppVariables } from './types';

type Row = Record<string, unknown>;

const app = new Hono<{ Variables: AppVariables }>();

app.get('/stats', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Not authenticated' }, 401);

  const scope = getQueryScope(c);
  const role = (user as Record<string, unknown>).role as string;
  const branchOverride = c.get('branchId');

  if (role === 'superadmin') {
    const filterTenantId = c.get('tenantId');
    const cacheKey = filterTenantId ? `dashboard:stats:${filterTenantId}` : 'dashboard:stats:all';
    const data = await withCache(filterTenantId, cacheKey, () => buildSuperadminStats(filterTenantId), 120);
    return c.json({ data });
  }

  if (role === 'tenant-admin' && !branchOverride) {
    const data = await withCache(scope.tenantId, 'dashboard:stats:branch-admin', () => buildBranchAdminStats(scope.tenantId), 120);
    return c.json({ data });
  }

  const statsKey = branchOverride ? `dashboard:stats:branch:${branchOverride}` : 'dashboard:stats:staff';
  const data = await withCache(scope.tenantId, statsKey, () => buildTenantStats(scope, role), 120);
  return c.json({ data });
});

async function buildTenantStats(
  scope: { tenantId?: string; branchId?: string },
  role: string,
) {
  if (!scope.tenantId) throw new Error('tenantId required for tenant stats');
  const effectiveBranchId = scope.branchId;
  const wheres = [eq(shipments.tenantId, scope.tenantId)];
  if (effectiveBranchId) wheres.push(eq(shipments.branchId, effectiveBranchId));
  const w = and(...wheres);

  const [sRow] = await db.execute<Row>(
    sql`
      SELECT
        COALESCE(SUM(CASE WHEN status='in_transit' THEN 1 ELSE 0 END),0)         AS "inTransit",
        COALESCE(SUM(CASE WHEN status='out_for_delivery' THEN 1 ELSE 0 END),0)   AS "outForDelivery",
        COALESCE(SUM(CASE WHEN status='delivered' THEN 1 ELSE 0 END),0)          AS delivered,
        COALESCE(SUM(CASE WHEN status IN ('exception','failed_attempt') THEN 1 ELSE 0 END),0) AS exceptions,
        COALESCE(SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END),0)            AS pending,
        COALESCE(SUM(CASE WHEN status='info_received' THEN 1 ELSE 0 END),0)      AS "infoReceived",
        COALESCE(SUM(CASE WHEN status='expired' THEN 1 ELSE 0 END),0)            AS expired,
        COUNT(*)                                                                  AS total,
        COALESCE(SUM(CASE WHEN status='delivered' AND actual_delivery>=CURRENT_DATE THEN 1 ELSE 0 END),0) AS "deliveredToday",
        COALESCE(SUM(CASE WHEN status='delivered' AND actual_delivery>=date_trunc('month',CURRENT_DATE) THEN 1 ELSE 0 END),0) AS "deliveredThisMonth",
        COALESCE(SUM(CASE WHEN status NOT IN ('delivered','expired') AND last_tracked_at<NOW()-INTERVAL '72 hours' THEN 1 ELSE 0 END),0) AS stale,
        COALESCE(SUM(CASE WHEN status NOT IN ('delivered','expired') AND estimated_delivery IS NOT NULL AND estimated_delivery<NOW()-INTERVAL '24 hours' THEN 1 ELSE 0 END),0) AS overdue,
        COALESCE(SUM(CASE WHEN tracking_registered=false AND created_at<NOW()-INTERVAL '24 hours' THEN 1 ELSE 0 END),0) AS "notTracked"
      FROM shipment WHERE ${w}
    `,
  );
  const s = sRow ?? {};

  const [pdRow] = await db.execute<Row>(
    sql`SELECT COALESCE(json_agg(json_build_object('date',d,'count',c) ORDER BY d),'[]'::json) AS val FROM (SELECT DATE(created_at) AS d, COUNT(*)::int AS c FROM shipment WHERE ${w} AND created_at>=NOW()-INTERVAL '1 year' GROUP BY d) sub`,
  );

  const [bcRow] = await db.execute<Row>(
    sql`SELECT COALESCE(json_agg(json_build_object('carrier',carrier,'count',c) ORDER BY c DESC),'[]'::json) AS val FROM (SELECT carrier, COUNT(*)::int AS c FROM shipment WHERE ${w} AND carrier IS NOT NULL GROUP BY carrier) sub`,
  );

  const allBranches = await db
    .select({ id: branches.id, name: branches.name })
    .from(branches)
    .where(eq(branches.tenantId, scope.tenantId!))
    .orderBy(branches.name);
  const branchCounts = await db
    .select({ branchId: shipments.branchId, count: sql<number>`COUNT(*)::int` })
    .from(shipments)
    .where(and(w, sql`branch_id IS NOT NULL`))
    .groupBy(shipments.branchId);
  const bbVal = allBranches.map((b) => ({
    branch: b.name,
    count: branchCounts.find((c) => c.branchId === b.id)?.count ?? 0,
  }));

  const [alRow] = await db.execute<Row>(
    sql`SELECT COALESCE(json_agg(json_build_object(
      'type', CASE WHEN status IN ('exception','failed_attempt') THEN 'exception' WHEN status NOT IN ('delivered','expired') AND last_tracked_at IS NOT NULL AND last_tracked_at<NOW()-INTERVAL '72 hours' THEN 'stale' WHEN status NOT IN ('delivered','expired') AND estimated_delivery IS NOT NULL AND estimated_delivery<NOW()-INTERVAL '24 hours' THEN 'overdue' ELSE 'unknown' END,
      'shipmentId',id,'trackingNo',tracking_no,'status',status,
      'lastTrackedAt',last_tracked_at,'estimatedDelivery',estimated_delivery,'updatedAt',updated_at
    ) ORDER BY updated_at DESC),'[]'::json) AS val
    FROM shipment WHERE ${w} AND (
      status IN ('exception','failed_attempt')
      OR (status NOT IN ('delivered','expired') AND last_tracked_at IS NOT NULL AND last_tracked_at<NOW()-INTERVAL '72 hours')
      OR (status NOT IN ('delivered','expired') AND estimated_delivery IS NOT NULL AND estimated_delivery<NOW()-INTERVAL '24 hours')
    ) LIMIT 10`,
  );

  const joinCond = (t: typeof customers | typeof quotations | typeof invoices) =>
    effectiveBranchId ? and(eq(t.tenantId, scope.tenantId!), eq(t.branchId, effectiveBranchId)) : eq(t.tenantId, scope.tenantId!);

  const [cRow] = await db.execute<Row>(
    sql`SELECT COUNT(*)::int AS total, COALESCE(SUM(CASE WHEN is_active THEN 1 ELSE 0 END),0)::int AS active FROM customer WHERE ${joinCond(customers)}`,
  );

  const [qRow] = await db.execute<Row>(
    sql`SELECT COUNT(*)::int AS total, COALESCE(SUM(CASE WHEN status='converted' THEN 1 ELSE 0 END),0)::int AS converted FROM quotation WHERE ${joinCond(quotations)}`,
  );

  const [iRow] = await db.execute<Row>(
    sql`SELECT COUNT(*)::int AS total, COALESCE(SUM(CAST(bill_amount AS numeric)),0)::text AS "revenueTotal", COALESCE(SUM(CAST(bill_amount AS numeric)) FILTER (WHERE created_at>=date_trunc('month',CURRENT_DATE)),0)::text AS "revenueThisMonth" FROM shipment WHERE bill_amount IS NOT NULL AND ${w}`,
  );

  const [rmRow] = await db.execute<Row>(
    sql`SELECT COALESCE(json_agg(json_build_object('month',m,'revenue',r) ORDER BY month_date),'[]'::json) AS val FROM (SELECT TO_CHAR(date_trunc('month',created_at),'Mon') AS m, date_trunc('month',created_at) AS month_date, SUM(CAST(bill_amount AS numeric))::float AS r FROM shipment WHERE ${w} AND bill_amount IS NOT NULL AND created_at>=NOW()-INTERVAL '2 years' GROUP BY date_trunc('month',created_at)) sub`,
  );

  const [bRow] = await db.execute<Row>(
    sql`SELECT COUNT(*)::int AS total FROM branch WHERE ${eq(branches.tenantId, scope.tenantId!)}`,
  );

  const byStatus: Record<string, number> = {
    in_transit: Number(s['inTransit'] ?? 0),
    out_for_delivery: Number(s['outForDelivery'] ?? 0),
    delivered: Number(s['delivered'] ?? 0),
    exception: Number(s['exceptions'] ?? 0),
    pending: Number(s['pending'] ?? 0),
    info_received: Number(s['infoReceived'] ?? 0),
    expired: Number(s['expired'] ?? 0),
    failed_attempt: 0,
  };

  const qt = Number(qRow?.['total'] ?? 0);
  const qc = Number(qRow?.['converted'] ?? 0);
  const conversionRate = qt > 0 ? Math.round((qc / qt) * 1000) / 10 : 0;

  const branchName = effectiveBranchId
    ? allBranches.find((b) => b.id === effectiveBranchId)?.name ?? null
    : null;

  return {
    role,
    scope: { tenantId: scope.tenantId, branchId: effectiveBranchId ?? null },
    shipments: {
      total: Number(s['total'] ?? 0),
      inTransit: Number(s['inTransit'] ?? 0),
      outForDelivery: Number(s['outForDelivery'] ?? 0),
      deliveredToday: Number(s['deliveredToday'] ?? 0),
      deliveredThisMonth: Number(s['deliveredThisMonth'] ?? 0),
      exceptions: Number(s['exceptions'] ?? 0),
      pending: Number(s['pending'] ?? 0),
      stale: Number(s['stale'] ?? 0),
      overdue: Number(s['overdue'] ?? 0),
      notTracked: Number(s['notTracked'] ?? 0),
      byStatus,
      perDay: pdRow?.['val'] ?? [],
      byCarrier: bcRow?.['val'] ?? [],
      byBranch: bbVal ?? [],
    },
    customers: { total: Number(cRow?.['total'] ?? 0), active: Number(cRow?.['active'] ?? 0) },
    quotations: { total: qt, converted: qc, conversionRate },
    invoices: {
      total: Number(iRow?.['total'] ?? 0),
      revenueThisMonth: (iRow?.['revenueThisMonth'] as string) ?? '0',
      revenueTotal: (iRow?.['revenueTotal'] as string) ?? '0',
    },
    revenuePerMonth: rmRow?.['val'] ?? [],
    perDay: pdRow?.['val'] ?? [],
    branches: { total: Number(bRow?.['total'] ?? 0) },
    alerts: alRow?.['val'] ?? [],
    total: {
      shipments: { total: Number(s['total'] ?? 0), inTransit: Number(s['inTransit'] ?? 0), deliveredToday: Number(s['deliveredToday'] ?? 0), exceptions: Number(s['exceptions'] ?? 0) },
      customers: { total: Number(cRow?.['total'] ?? 0), active: Number(cRow?.['active'] ?? 0) },
      quotations: { total: qt, conversionRate },
      invoices: { total: Number(iRow?.['total'] ?? 0), revenueThisMonth: (iRow?.['revenueThisMonth'] as string) ?? '0', revenueTotal: (iRow?.['revenueTotal'] as string) ?? '0' },
    },
    perBranch: effectiveBranchId && branchName
      ? [{
          branchId: effectiveBranchId,
          branchName,
          shipments: { total: Number(s['total'] ?? 0), inTransit: Number(s['inTransit'] ?? 0), deliveredToday: Number(s['deliveredToday'] ?? 0), exceptions: Number(s['exceptions'] ?? 0) },
          invoices: { revenueTotal: (iRow?.['revenueTotal'] as string) ?? '0', revenueThisMonth: (iRow?.['revenueThisMonth'] as string) ?? '0' },
          customers: { total: Number(cRow?.['total'] ?? 0), active: Number(cRow?.['active'] ?? 0) },
        }]
      : [],
    perTenant: [],
  };
}

async function buildBranchAdminStats(tenantId: string | undefined) {
  if (!tenantId) throw new Error('tenantId required');
  const tFilter = sql`AND tenant_id=${tenantId}`;
  const tWhere = sql`WHERE tenant_id=${tenantId}`;

  // Tenant-wide totals
  const [sRow] = await db.execute<Row>(
    sql`SELECT COUNT(*)::int AS total, COALESCE(SUM(CASE WHEN status='in_transit' THEN 1 ELSE 0 END),0) AS "inTransit", COALESCE(SUM(CASE WHEN status IN ('exception','failed_attempt') THEN 1 ELSE 0 END),0) AS exceptions, COALESCE(SUM(CASE WHEN status='delivered' AND actual_delivery>=CURRENT_DATE THEN 1 ELSE 0 END),0) AS "deliveredToday" FROM shipment ${tWhere}`,
  );
  const s = sRow ?? {};

  const [cRow] = await db.execute<Row>(
    sql`SELECT COUNT(*)::int AS total, COALESCE(SUM(CASE WHEN is_active THEN 1 ELSE 0 END),0)::int AS active FROM customer ${sql`WHERE tenant_id=${tenantId}`}`,
  );

  const [qRow] = await db.execute<Row>(
    sql`SELECT COUNT(*)::int AS total, COALESCE(SUM(CASE WHEN status='converted' THEN 1 ELSE 0 END),0)::int AS converted FROM quotation ${sql`WHERE tenant_id=${tenantId}`}`,
  );

  const [iRow] = await db.execute<Row>(
    sql`SELECT COUNT(*)::int AS total, COALESCE(SUM(CAST(bill_amount AS numeric)),0)::text AS "revenueTotal", COALESCE(SUM(CAST(bill_amount AS numeric)) FILTER (WHERE created_at>=date_trunc('month',CURRENT_DATE)),0)::text AS "revenueThisMonth" FROM shipment WHERE bill_amount IS NOT NULL AND tenant_id=${tenantId}`,
  );

  // Per-branch breakdown
  const [pbRow] = await db.execute<Row>(
    sql`SELECT COALESCE(json_agg(json_build_object(
      'branchId',b.id,'branchName',b.name,
      'shipments',json_build_object('total',COALESCE(s.c,0),'inTransit',COALESCE(s.it,0),'deliveredToday',COALESCE(s.dt,0),'exceptions',COALESCE(s.ex,0)),
      'invoices',json_build_object('revenueTotal',COALESCE(i.rt,'0'),'revenueThisMonth',COALESCE(i.rm,'0')),
      'customers',json_build_object('total',COALESCE(cu.ct,0),'active',COALESCE(cu.ca,0))
    ) ORDER BY b.name),'[]'::json) AS val
    FROM branch b
    LEFT JOIN LATERAL (SELECT COUNT(*)::int AS c, COUNT(*) FILTER (WHERE status='in_transit')::int AS it, COUNT(*) FILTER (WHERE status='delivered' AND actual_delivery>=CURRENT_DATE)::int AS dt, COUNT(*) FILTER (WHERE status IN ('exception','failed_attempt'))::int AS ex FROM shipment WHERE tenant_id=b.tenant_id AND branch_id=b.id) s ON true
    LEFT JOIN LATERAL (SELECT COALESCE(SUM(CAST(bill_amount AS numeric)),0)::text AS rt, COALESCE(SUM(CAST(bill_amount AS numeric)) FILTER (WHERE created_at>=date_trunc('month',CURRENT_DATE)),0)::text AS rm FROM shipment WHERE bill_amount IS NOT NULL AND tenant_id=b.tenant_id AND branch_id=b.id) i ON true
    LEFT JOIN LATERAL (SELECT COUNT(*)::int AS ct, COALESCE(SUM(CASE WHEN is_active THEN 1 ELSE 0 END),0)::int AS ca FROM customer WHERE tenant_id=b.tenant_id AND branch_id=b.id) cu ON true
    WHERE b.tenant_id=${tenantId}`,
  );

  const [rmRow] = await db.execute<Row>(
    sql`SELECT COALESCE(json_agg(json_build_object('month',m,'revenue',r) ORDER BY month_date),'[]'::json) AS val FROM (SELECT TO_CHAR(date_trunc('month',created_at),'Mon') AS m, date_trunc('month',created_at) AS month_date, SUM(CAST(bill_amount AS numeric))::float AS r FROM shipment WHERE bill_amount IS NOT NULL AND created_at>=NOW()-INTERVAL '2 years' ${tFilter} GROUP BY date_trunc('month',created_at)) sub`,
  );

  const [pdRow] = await db.execute<Row>(
    sql`SELECT COALESCE(json_agg(json_build_object('date',d,'count',c) ORDER BY d),'[]'::json) AS val FROM (SELECT DATE(created_at) AS d, COUNT(*)::int AS c FROM shipment WHERE created_at>=NOW()-INTERVAL '1 year' ${tFilter} GROUP BY d) sub`,
  );

  const [alRow] = await db.execute<Row>(
    sql`SELECT COALESCE(json_agg(json_build_object(
      'type',CASE WHEN status IN ('exception','failed_attempt') THEN 'exception' WHEN last_tracked_at IS NOT NULL AND last_tracked_at<NOW()-INTERVAL '72 hours' THEN 'stale' WHEN estimated_delivery IS NOT NULL AND estimated_delivery<NOW()-INTERVAL '24 hours' THEN 'overdue' ELSE 'unknown' END,
      'shipmentId',id,'trackingNo',tracking_no,'status',status,
      'lastTrackedAt',last_tracked_at,'estimatedDelivery',estimated_delivery,'updatedAt',updated_at
    ) ORDER BY updated_at DESC),'[]'::json) AS val
    FROM shipment WHERE (status IN ('exception','failed_attempt') OR (status NOT IN ('delivered','expired') AND last_tracked_at IS NOT NULL AND last_tracked_at<NOW()-INTERVAL '72 hours') OR (status NOT IN ('delivered','expired') AND estimated_delivery IS NOT NULL AND estimated_delivery<NOW()-INTERVAL '24 hours')) ${tFilter} LIMIT 10`,
  );

  const qt = Number(qRow?.['total'] ?? 0);
  const qc = Number(qRow?.['converted'] ?? 0);
  const conversionRate = qt > 0 ? Math.round((qc / qt) * 1000) / 10 : 0;

  return {
    role: 'tenant-admin',
    scope: {},
    total: {
      shipments: { total: Number(s['total'] ?? 0), inTransit: Number(s['inTransit'] ?? 0), deliveredToday: Number(s['deliveredToday'] ?? 0), exceptions: Number(s['exceptions'] ?? 0) },
      customers: { total: Number(cRow?.['total'] ?? 0), active: Number(cRow?.['active'] ?? 0) },
      quotations: { total: qt, conversionRate },
      invoices: { total: Number(iRow?.['total'] ?? 0), revenueThisMonth: (iRow?.['revenueThisMonth'] as string) ?? '0', revenueTotal: (iRow?.['revenueTotal'] as string) ?? '0' },
    },
    perBranch: pbRow?.['val'] ?? [],
    perDay: pdRow?.['val'] ?? [],
    revenuePerMonth: rmRow?.['val'] ?? [],
    alerts: alRow?.['val'] ?? [],
  };
}

async function buildSuperadminStats(filterTenantId: string | null) {
  const tFilter = filterTenantId ? sql`AND tenant_id=${filterTenantId}` : sql``;
  const tWhere = filterTenantId ? sql`WHERE tenant_id=${filterTenantId}` : sql``;
  const cusWhere = filterTenantId ? sql`WHERE tenant_id=${filterTenantId}` : sql``;
  const qWhere = filterTenantId ? sql`WHERE tenant_id=${filterTenantId}` : sql``;

  const [sRow] = await db.execute<Row>(
    sql`SELECT COUNT(*)::int AS total, COALESCE(SUM(CASE WHEN status='in_transit' THEN 1 ELSE 0 END),0) AS "inTransit", COALESCE(SUM(CASE WHEN status IN ('exception','failed_attempt') THEN 1 ELSE 0 END),0) AS exceptions, COALESCE(SUM(CASE WHEN status='delivered' AND actual_delivery>=CURRENT_DATE THEN 1 ELSE 0 END),0) AS "deliveredToday" FROM shipment ${tWhere}`,
  );
  const s = sRow ?? {};

  const [cRow] = await db.execute<Row>(
    sql`SELECT COUNT(*)::int AS total, COALESCE(SUM(CASE WHEN is_active THEN 1 ELSE 0 END),0)::int AS active FROM customer ${cusWhere}`,
  );

  const [qRow] = await db.execute<Row>(
    sql`SELECT COUNT(*)::int AS total, COALESCE(SUM(CASE WHEN status='converted' THEN 1 ELSE 0 END),0)::int AS converted FROM quotation ${qWhere}`,
  );

  const [iRow] = await db.execute<Row>(
    sql`SELECT COUNT(*)::int AS total, COALESCE(SUM(CAST(bill_amount AS numeric)),0)::text AS "revenueTotal", COALESCE(SUM(CAST(bill_amount AS numeric)) FILTER (WHERE created_at>=date_trunc('month',CURRENT_DATE)),0)::text AS "revenueThisMonth" FROM shipment WHERE bill_amount IS NOT NULL ${tFilter}`,
  );

  const [ptRow] = await db.execute<Row>(
    sql`SELECT COALESCE(json_agg(json_build_object(
      'tenantId',t.id,'tenantName',t.name,
      'shipments',json_build_object('total',COALESCE(s.c,0),'inTransit',COALESCE(s.it,0),'deliveredToday',COALESCE(s.dt,0),'exceptions',COALESCE(s.ex,0)),
      'invoices',json_build_object('revenueTotal',COALESCE(i.rt,'0'),'revenueThisMonth',COALESCE(i.rm,'0')),
      'branches',json_build_object('total',COALESCE(b.bc,0))
    ) ORDER BY t.name),'[]'::json) AS val
    FROM tenant t
    LEFT JOIN LATERAL (SELECT COUNT(*)::int AS c, COUNT(*) FILTER (WHERE status='in_transit')::int AS it, COUNT(*) FILTER (WHERE status='delivered' AND actual_delivery>=CURRENT_DATE)::int AS dt, COUNT(*) FILTER (WHERE status IN ('exception','failed_attempt'))::int AS ex FROM shipment WHERE tenant_id=t.id) s ON true
    LEFT JOIN LATERAL (SELECT COALESCE(SUM(CAST(bill_amount AS numeric)),0)::text AS rt, COALESCE(SUM(CAST(bill_amount AS numeric)) FILTER (WHERE created_at>=date_trunc('month',CURRENT_DATE)),0)::text AS rm FROM shipment WHERE bill_amount IS NOT NULL AND tenant_id=t.id) i ON true
    LEFT JOIN LATERAL (SELECT COUNT(*)::int AS bc FROM branch WHERE tenant_id=t.id) b ON true
    ${filterTenantId ? sql`WHERE t.id=${filterTenantId}` : sql``}`,
  );

  const [rmRow] = await db.execute<Row>(
    sql`SELECT COALESCE(json_agg(json_build_object('month',m,'revenue',r) ORDER BY month_date),'[]'::json) AS val FROM (SELECT TO_CHAR(date_trunc('month',created_at),'Mon') AS m, date_trunc('month',created_at) AS month_date, SUM(CAST(bill_amount AS numeric))::float AS r FROM shipment WHERE bill_amount IS NOT NULL AND created_at>=NOW()-INTERVAL '2 years' ${tFilter} GROUP BY date_trunc('month',created_at)) sub`,
  );

  const [pdRow] = await db.execute<Row>(
    sql`SELECT COALESCE(json_agg(json_build_object('date',d,'count',c) ORDER BY d),'[]'::json) AS val FROM (SELECT DATE(created_at) AS d, COUNT(*)::int AS c FROM shipment WHERE created_at>=NOW()-INTERVAL '1 year' ${tFilter} GROUP BY d) sub`,
  );

  const [alRow] = await db.execute<Row>(
    sql`SELECT COALESCE(json_agg(json_build_object(
      'type',CASE WHEN status IN ('exception','failed_attempt') THEN 'exception' WHEN last_tracked_at IS NOT NULL AND last_tracked_at<NOW()-INTERVAL '72 hours' THEN 'stale' WHEN estimated_delivery IS NOT NULL AND estimated_delivery<NOW()-INTERVAL '24 hours' THEN 'overdue' ELSE 'unknown' END,
      'shipmentId',id,'trackingNo',tracking_no,'status',status,
      'lastTrackedAt',last_tracked_at,'estimatedDelivery',estimated_delivery,'updatedAt',updated_at
    ) ORDER BY updated_at DESC),'[]'::json) AS val
    FROM shipment WHERE (status IN ('exception','failed_attempt') OR (status NOT IN ('delivered','expired') AND last_tracked_at IS NOT NULL AND last_tracked_at<NOW()-INTERVAL '72 hours') OR (status NOT IN ('delivered','expired') AND estimated_delivery IS NOT NULL AND estimated_delivery<NOW()-INTERVAL '24 hours')) ${tFilter} LIMIT 10`,
  );

  const qt = Number(qRow?.['total'] ?? 0);
  const qc = Number(qRow?.['converted'] ?? 0);
  const conversionRate = qt > 0 ? Math.round((qc / qt) * 1000) / 10 : 0;

  return {
    role: 'superadmin',
    scope: {},
    total: {
      shipments: { total: Number(s['total'] ?? 0), inTransit: Number(s['inTransit'] ?? 0), deliveredToday: Number(s['deliveredToday'] ?? 0), exceptions: Number(s['exceptions'] ?? 0) },
      customers: { total: Number(cRow?.['total'] ?? 0), active: Number(cRow?.['active'] ?? 0) },
      quotations: { total: qt, conversionRate },
      invoices: { total: Number(iRow?.['total'] ?? 0), revenueThisMonth: (iRow?.['revenueThisMonth'] as string) ?? '0', revenueTotal: (iRow?.['revenueTotal'] as string) ?? '0' },
    },
    perTenant: ptRow?.['val'] ?? [],
    perDay: pdRow?.['val'] ?? [],
    revenuePerMonth: rmRow?.['val'] ?? [],
    alerts: alRow?.['val'] ?? [],
  };
}

app.get('/branches', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ data: [] });

  const rows = await withCache(tenantId, 'dashboard:branches', () =>
    db
      .select({ id: branches.id, name: branches.name })
      .from(branches)
      .where(eq(branches.tenantId, tenantId))
      .orderBy(branches.name),
    300,
  );

  return c.json({ data: rows });
});

export default app;
