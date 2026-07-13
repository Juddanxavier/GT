/** @format */

/**
 * Shared SQL query helpers for dashboard stats.
 *
 * Eliminates ~600 lines of duplicated SQL across
 * buildTenantStats, buildBranchAdminStats, and buildSuperadminStats
 * by extracting common query patterns into parameterized helpers.
 */

import { and, eq, isNull, type SQL, sql } from 'drizzle-orm';
import { db } from '../db';
import { branches, user, quotations, shipments } from '../db/schema';

type Row = Record<string, unknown>;

// ── Types ──

export type StatsFilter = {
  tenantId?: string;
  branchId?: string;
  /** If true, generate a raw SQL filter (used by branch-admin / superadmin paths).
   *  When true, tenantId becomes sql`AND tenant_id=${tenantId}` or sql`` if undefined. */
  raw?: boolean;
  /** For the 'no filter' case (superadmin without tenant filter) — pass true to return empty SQL */
  allowEmpty?: boolean;
};

export type PerBranchRow = {
  branchId: string;
  branchName: string;
  shipments: {
    total: number;
    inTransit: number;
    deliveredToday: number;
    exceptions: number;
  };
  invoices: {
    revenueTotal: string;
    revenueThisMonth: string;
  };
  customers: {
    total: number;
    active: number;
  };
};

export type PerTenantRow = {
  tenantId: string;
  tenantName: string;
  shipments: {
    total: number;
    inTransit: number;
    deliveredToday: number;
    exceptions: number;
  };
  invoices: {
    revenueTotal: string;
    revenueThisMonth: string;
  };
  branches: {
    total: number;
  };
};

// ── WHERE Clause Builders ──

/**
 * Build a WHERE clause for shipment queries using Drizzle conditions.
 * Returns `and(...conditions)` — safe for parameterized queries.
 */
export function makeShipmentWhere(filter: StatsFilter): SQL | undefined {
  const conditions: SQL[] = [isNull(shipments.archivedAt)];
  if (filter.tenantId) conditions.push(eq(shipments.tenantId, filter.tenantId));
  if (filter.branchId) conditions.push(eq(shipments.branchId, filter.branchId));
  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Build a raw SQL filter fragment (for superadmin/branch-admin paths that
 * build dynamic SQL strings).
 * Returns `sql\`AND tenant_id=${tenantId}\`` or empty sql\`\``.
 */
export function makeRawShipmentFilter(tenantId?: string): SQL {
  const base = sql`AND archived_at IS NULL`;
  return tenantId ? sql`${base} AND tenant_id=${tenantId}` : base;
}

export function makeRawShipmentWhere(tenantId?: string): SQL {
  const base = sql`WHERE archived_at IS NULL`;
  return tenantId ? sql`${base} AND tenant_id=${tenantId}` : base;
}

/**
 * Build a WHERE clause for non-shipment tables (customers, quotations)
 * that support optional branchId filtering via Drizzle conditions.
 */
export function makeJoinCondition(
  table: typeof quotations,
  filter: StatsFilter,
): SQL | undefined {
  const conditions: SQL[] = [];
  if (filter.tenantId) conditions.push(eq(table.tenantId, filter.tenantId));
  if (filter.branchId) conditions.push(eq(table.branchId, filter.branchId));
  return conditions.length > 0 ? and(...conditions) : undefined;
}

// ── Shipment Stats Queries ──

/** Detailed shipment stats with all 13 metric columns */
export async function queryShipmentDetailed(filter: StatsFilter): Promise<Row> {
  const w = makeShipmentWhere(filter);
  const [row] = await db.execute<Row>(
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
      FROM shipment${w ? sql` WHERE ${w}` : sql``}
    `,
  );
  return row ?? {};
}

/** Summary shipment stats (4 columns) */
export async function queryShipmentSummary(where: SQL | undefined): Promise<Row> {
  const [row] = await db.execute<Row>(
    sql`
      SELECT
        COUNT(*)::int AS total,
        COALESCE(SUM(CASE WHEN status='in_transit' THEN 1 ELSE 0 END),0) AS "inTransit",
        COALESCE(SUM(CASE WHEN status IN ('exception','failed_attempt') THEN 1 ELSE 0 END),0) AS exceptions,
        COALESCE(SUM(CASE WHEN status='delivered' AND actual_delivery>=CURRENT_DATE THEN 1 ELSE 0 END),0) AS "deliveredToday"
      FROM shipment${where ? sql` ${where}` : sql``}
    `,
  );
  return row ?? {};
}

// ── Entity Count Queries ──

export async function queryCustomerCount(filter: StatsFilter): Promise<Row> {
  const conditions: SQL[] = [];
  if (filter.tenantId) conditions.push(eq(user.tenantId, filter.tenantId));
  if (filter.branchId) conditions.push(eq(user.branchId, filter.branchId));
  conditions.push(eq(user.role, 'customer'));
  const w = conditions.length > 0 ? and(...conditions) : undefined;
  const [row] = await db.execute<Row>(
    sql`
      SELECT COUNT(*)::int AS total,
        COALESCE(SUM(CASE WHEN is_active THEN 1 ELSE 0 END),0)::int AS active
      FROM "user"${w ? sql` WHERE ${w}` : sql``}
    `,
  );
  return row ?? {};
}

export async function queryCustomerCountRaw(where: SQL | undefined): Promise<Row> {
  const [row] = await db.execute<Row>(
    sql`
      SELECT COUNT(*)::int AS total,
        COALESCE(SUM(CASE WHEN is_active THEN 1 ELSE 0 END),0)::int AS active
      FROM "user" WHERE role='customer' ${where ?? sql``}
    `,
  );
  return row ?? {};
}

export async function queryQuotationCount(filter: StatsFilter): Promise<Row> {
  const w = makeJoinCondition(quotations, filter);
  const [row] = await db.execute<Row>(
    sql`
      SELECT COUNT(*)::int AS total,
        COALESCE(SUM(CASE WHEN status='converted' THEN 1 ELSE 0 END),0)::int AS converted
      FROM quotation${w ? sql` WHERE ${w}` : sql``}
    `,
  );
  return row ?? {};
}

export async function queryQuotationCountRaw(where: SQL | undefined): Promise<Row> {
  const [row] = await db.execute<Row>(
    sql`
      SELECT COUNT(*)::int AS total,
        COALESCE(SUM(CASE WHEN status='converted' THEN 1 ELSE 0 END),0)::int AS converted
      FROM quotation ${where ?? sql``}
    `,
  );
  return row ?? {};
}

// ── Revenue Queries ──

export async function queryRevenueStats(filter: StatsFilter): Promise<Row> {
  const w = makeShipmentWhere(filter);
  const [row] = await db.execute<Row>(
    sql`
      SELECT COUNT(*)::int AS total,
        COALESCE(SUM(CAST(bill_amount AS numeric)),0)::text AS "revenueTotal",
        COALESCE(SUM(CAST(bill_amount AS numeric)) FILTER (WHERE created_at>=date_trunc('month',CURRENT_DATE)),0)::text AS "revenueThisMonth"
      FROM shipment WHERE bill_amount IS NOT NULL${w ? sql` AND ${w}` : sql``}
    `,
  );
  return row ?? {};
}

export async function queryRevenueStatsRaw(filter: SQL | undefined): Promise<Row> {
  const [row] = await db.execute<Row>(
    sql`
      SELECT COUNT(*)::int AS total,
        COALESCE(SUM(CAST(bill_amount AS numeric)),0)::text AS "revenueTotal",
        COALESCE(SUM(CAST(bill_amount AS numeric)) FILTER (WHERE created_at>=date_trunc('month',CURRENT_DATE)),0)::text AS "revenueThisMonth"
      FROM shipment WHERE archived_at IS NULL AND bill_amount IS NOT NULL ${filter ?? sql``}
    `,
  );
  return row ?? {};
}

// ── Per-Day Shipments ──

export async function queryPerDayShipments(filter: StatsFilter): Promise<unknown[]> {
  const w = makeShipmentWhere(filter);
  const [row] = await db.execute<Row>(
    sql`
      SELECT COALESCE(json_agg(json_build_object('date',d,'count',c) ORDER BY d),'[]'::json) AS val
      FROM (
        SELECT DATE(created_at) AS d, COUNT(*)::int AS c
        FROM shipment${w ? sql` WHERE ${w} AND` : sql` WHERE`} created_at>=NOW()-INTERVAL '1 year'
        GROUP BY d
      ) sub
    `,
  );
  return (row?.val as unknown[]) ?? [];
}

export async function queryPerDayShipmentsRaw(filter: SQL | undefined): Promise<unknown[]> {
  const [row] = await db.execute<Row>(
    sql`
      SELECT COALESCE(json_agg(json_build_object('date',d,'count',c) ORDER BY d),'[]'::json) AS val
      FROM (
        SELECT DATE(created_at) AS d, COUNT(*)::int AS c
        FROM shipment WHERE archived_at IS NULL AND created_at>=NOW()-INTERVAL '1 year' ${filter ?? sql``}
        GROUP BY d
      ) sub
    `,
  );
  return (row?.val as unknown[]) ?? [];
}

// ── Revenue Per Month ──

export async function queryRevenuePerMonth(filter: StatsFilter): Promise<unknown[]> {
  const w = makeShipmentWhere(filter);
  const [row] = await db.execute<Row>(
    sql`
      SELECT COALESCE(json_agg(json_build_object('month',m,'revenue',r) ORDER BY month_date),'[]'::json) AS val
      FROM (
        SELECT TO_CHAR(date_trunc('month',created_at),'Mon') AS m,
               date_trunc('month',created_at) AS month_date,
               SUM(CAST(bill_amount AS numeric))::float AS r
        FROM shipment${w ? sql` WHERE ${w} AND` : sql` WHERE`} bill_amount IS NOT NULL AND created_at>=NOW()-INTERVAL '2 years'
        GROUP BY date_trunc('month',created_at)
      ) sub
    `,
  );
  return (row?.val as unknown[]) ?? [];
}

export async function queryRevenuePerMonthRaw(filter: SQL | undefined): Promise<unknown[]> {
  const [row] = await db.execute<Row>(
    sql`
      SELECT COALESCE(json_agg(json_build_object('month',m,'revenue',r) ORDER BY month_date),'[]'::json) AS val
      FROM (
        SELECT TO_CHAR(date_trunc('month',created_at),'Mon') AS m,
               date_trunc('month',created_at) AS month_date,
               SUM(CAST(bill_amount AS numeric))::float AS r
        FROM shipment WHERE archived_at IS NULL AND bill_amount IS NOT NULL AND created_at>=NOW()-INTERVAL '2 years' ${filter ?? sql``}
        GROUP BY date_trunc('month',created_at)
      ) sub
    `,
  );
  return (row?.val as unknown[]) ?? [];
}

// ── By-Carrier ──

export async function queryByCarrier(filter: StatsFilter): Promise<unknown[]> {
  const w = makeShipmentWhere(filter);
  const [row] = await db.execute<Row>(
    sql`
      SELECT COALESCE(json_agg(json_build_object('carrier',carrier,'count',c) ORDER BY c DESC),'[]'::json) AS val
      FROM (
        SELECT carrier, COUNT(*)::int AS c
        FROM shipment${w ? sql` WHERE ${w} AND` : sql` WHERE`} carrier IS NOT NULL
        GROUP BY carrier
      ) sub
    `,
  );
  return (row?.val as unknown[]) ?? [];
}

// ── Alerts ──

export async function queryAlerts(filter: StatsFilter): Promise<unknown[]> {
  const w = makeShipmentWhere(filter);
  const [row] = await db.execute<Row>(
    sql`
      SELECT COALESCE(json_agg(json_build_object(
        'type', CASE
          WHEN status IN ('exception','failed_attempt') THEN 'exception'
          WHEN status NOT IN ('delivered','expired') AND last_tracked_at IS NOT NULL AND last_tracked_at<NOW()-INTERVAL '72 hours' THEN 'stale'
          WHEN status NOT IN ('delivered','expired') AND estimated_delivery IS NOT NULL AND estimated_delivery<NOW()-INTERVAL '24 hours' THEN 'overdue'
          ELSE 'unknown' END,
        'shipmentId',id,'trackingNo',tracking_no,'status',status,
        'lastTrackedAt',last_tracked_at,'estimatedDelivery',estimated_delivery,'updatedAt',updated_at
      ) ORDER BY updated_at DESC),'[]'::json) AS val
      FROM shipment
      WHERE (status IN ('exception','failed_attempt')
        OR (status NOT IN ('delivered','expired') AND last_tracked_at IS NOT NULL AND last_tracked_at<NOW()-INTERVAL '72 hours')
        OR (status NOT IN ('delivered','expired') AND estimated_delivery IS NOT NULL AND estimated_delivery<NOW()-INTERVAL '24 hours'))
      ${w ? sql` AND ${w}` : sql``}
      LIMIT 10
    `,
  );
  return (row?.val as unknown[]) ?? [];
}

export async function queryAlertsRaw(filter: SQL | undefined): Promise<unknown[]> {
  const [row] = await db.execute<Row>(
    sql`
      SELECT COALESCE(json_agg(json_build_object(
        'type', CASE
          WHEN status IN ('exception','failed_attempt') THEN 'exception'
          WHEN status NOT IN ('delivered','expired') AND last_tracked_at IS NOT NULL AND last_tracked_at<NOW()-INTERVAL '72 hours' THEN 'stale'
          WHEN status NOT IN ('delivered','expired') AND estimated_delivery IS NOT NULL AND estimated_delivery<NOW()-INTERVAL '24 hours' THEN 'overdue'
          ELSE 'unknown' END,
        'shipmentId',id,'trackingNo',tracking_no,'status',status,
        'lastTrackedAt',last_tracked_at,'estimatedDelivery',estimated_delivery,'updatedAt',updated_at
      ) ORDER BY updated_at DESC),'[]'::json) AS val
      FROM shipment WHERE (status IN ('exception','failed_attempt')
        OR (status NOT IN ('delivered','expired') AND last_tracked_at IS NOT NULL AND last_tracked_at<NOW()-INTERVAL '72 hours')
        OR (status NOT IN ('delivered','expired') AND estimated_delivery IS NOT NULL AND estimated_delivery<NOW()-INTERVAL '24 hours'))
      ${filter ?? sql``}
      LIMIT 10
    `,
  );
  return (row?.val as unknown[]) ?? [];
}

// ── Branch Queries ──

export async function queryBranchList(tenantId: string): Promise<{ id: string; name: string }[]> {
  return db
    .select({ id: branches.id, name: branches.name })
    .from(branches)
    .where(eq(branches.tenantId, tenantId))
    .orderBy(branches.name);
}

export async function queryBranchShipmentCounts(
  filter: StatsFilter,
): Promise<{ branchId: string; count: number }[]> {
  const w = makeShipmentWhere(filter);
  const rows = await db.execute<Row>(
    sql`
      SELECT branch_id AS "branchId", COUNT(*)::int AS count
      FROM shipment
      WHERE ${w} AND branch_id IS NOT NULL
      GROUP BY branch_id
    `,
  );
  return (rows as unknown as { branchId: string; count: number }[]) ?? [];
}

// ── Per-Branch / Per-Tenant Lateral Join Queries ──

/**
 * Build per-branch stats using lateral joins.
 * Returns JSON for all branches in a tenant.
 */
export async function queryPerBranchBreakdown(tenantId: string): Promise<unknown[]> {
  const [row] = await db.execute<Row>(
    sql`
      SELECT COALESCE(json_agg(json_build_object(
        'branchId',b.id,'branchName',b.name,
        'shipments',json_build_object('total',COALESCE(s.c,0),'inTransit',COALESCE(s.it,0),'deliveredToday',COALESCE(s.dt,0),'exceptions',COALESCE(s.ex,0)),
        'invoices',json_build_object('revenueTotal',COALESCE(i.rt,'0'),'revenueThisMonth',COALESCE(i.rm,'0')),
        'customers',json_build_object('total',COALESCE(cu.ct,0),'active',COALESCE(cu.ca,0))
      ) ORDER BY b.name),'[]'::json) AS val
      FROM branch b
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS c,
               COUNT(*) FILTER (WHERE status='in_transit')::int AS it,
               COUNT(*) FILTER (WHERE status='delivered' AND actual_delivery>=CURRENT_DATE)::int AS dt,
               COUNT(*) FILTER (WHERE status IN ('exception','failed_attempt'))::int AS ex
        FROM shipment WHERE archived_at IS NULL AND tenant_id=b.tenant_id AND branch_id=b.id
      ) s ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(CAST(bill_amount AS numeric)),0)::text AS rt,
               COALESCE(SUM(CAST(bill_amount AS numeric)) FILTER (WHERE created_at>=date_trunc('month',CURRENT_DATE)),0)::text AS rm
        FROM shipment WHERE archived_at IS NULL AND bill_amount IS NOT NULL AND tenant_id=b.tenant_id AND branch_id=b.id
      ) i ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS ct,
               COALESCE(SUM(CASE WHEN is_active THEN 1 ELSE 0 END),0)::int AS ca
        FROM "user" WHERE role='customer' AND tenant_id=b.tenant_id AND branch_id=b.id
      ) cu ON true
      WHERE b.tenant_id=${tenantId}
    `,
  );
  return (row?.val as unknown[]) ?? [];
}

/**
 * Build per-tenant stats using lateral joins.
 * Optionally filters to a single tenant.
 */
export async function queryPerTenantBreakdown(tenantId?: string | null): Promise<unknown[]> {
  const [row] = await db.execute<Row>(
    sql`
      SELECT COALESCE(json_agg(json_build_object(
        'tenantId',t.id,'tenantName',t.name,
        'shipments',json_build_object('total',COALESCE(s.c,0),'inTransit',COALESCE(s.it,0),'deliveredToday',COALESCE(s.dt,0),'exceptions',COALESCE(s.ex,0)),
        'invoices',json_build_object('revenueTotal',COALESCE(i.rt,'0'),'revenueThisMonth',COALESCE(i.rm,'0')),
        'branches',json_build_object('total',COALESCE(b.bc,0))
      ) ORDER BY t.name),'[]'::json) AS val
      FROM tenant t
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS c,
               COUNT(*) FILTER (WHERE status='in_transit')::int AS it,
               COUNT(*) FILTER (WHERE status='delivered' AND actual_delivery>=CURRENT_DATE)::int AS dt,
               COUNT(*) FILTER (WHERE status IN ('exception','failed_attempt'))::int AS ex
        FROM shipment WHERE archived_at IS NULL AND tenant_id=t.id
      ) s ON true
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(CAST(bill_amount AS numeric)),0)::text AS rt,
               COALESCE(SUM(CAST(bill_amount AS numeric)) FILTER (WHERE created_at>=date_trunc('month',CURRENT_DATE)),0)::text AS rm
        FROM shipment WHERE archived_at IS NULL AND bill_amount IS NOT NULL AND tenant_id=t.id
      ) i ON true
      LEFT JOIN LATERAL (SELECT COUNT(*)::int AS bc FROM branch WHERE tenant_id=t.id) b ON true
      ${tenantId ? sql`WHERE t.id=${tenantId}` : sql``}
    `,
  );
  return (row?.val as unknown[]) ?? [];
}

// ── Utility ──

export function computeConversionRate(total: number, converted: number): number {
  return total > 0 ? Math.round((converted / total) * 1000) / 10 : 0;
}
