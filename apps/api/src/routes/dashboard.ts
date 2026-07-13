import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { withCache } from '../cache';
import { db } from '../db';
import { branches } from '../db/schema';
import { getQueryScope, requireRole } from '../middleware/authorization';
import {
  computeConversionRate,
  makeRawShipmentFilter,
  makeRawShipmentWhere,
  queryAlerts,
  queryAlertsRaw,
  queryBranchShipmentCounts,
  queryByCarrier,
  queryCustomerCount,
  queryCustomerCountRaw,
  queryPerBranchBreakdown,
  queryPerDayShipments,
  queryPerDayShipmentsRaw,
  queryPerTenantBreakdown,
  queryQuotationCount,
  queryQuotationCountRaw,
  queryRevenuePerMonth,
  queryRevenuePerMonthRaw,
  queryRevenueStats,
  queryRevenueStatsRaw,
  queryShipmentDetailed,
  queryShipmentSummary,
  type StatsFilter,
} from '../services/dashboard-stats';
import type { AppVariables } from './types';

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
    const data = await withCache(
      filterTenantId,
      cacheKey,
      () => buildSuperadminStats(filterTenantId),
      120,
    );
    return c.json({ data });
  }

  if (role === 'tenant-admin' && !branchOverride) {
    const data = await withCache(
      scope.tenantId!,
      'dashboard:stats:branch-admin',
      () => buildBranchAdminStats(scope.tenantId),
      120,
    );
    return c.json({ data });
  }

  const statsKey = branchOverride
    ? `dashboard:stats:branch:${branchOverride}`
    : 'dashboard:stats:staff';
  const data = await withCache(scope.tenantId!, statsKey, () => buildTenantStats(scope, role), 120);
  return c.json({ data });
});

async function buildTenantStats(scope: { tenantId?: string; branchId?: string }, role: string) {
  if (!scope.tenantId) throw new Error('tenantId required for tenant stats');
  const filter: StatsFilter = { tenantId: scope.tenantId, branchId: scope.branchId };

  const [s, pdVal, bcVal, cRow, qRow, iRow, rmVal, alVal, bRow] = await Promise.all([
    queryShipmentDetailed(filter),
    queryPerDayShipments(filter),
    queryByCarrier(filter),
    queryCustomerCount(filter),
    queryQuotationCount(filter),
    queryRevenueStats(filter),
    queryRevenuePerMonth(filter),
    queryAlerts(filter),
    db
      .select({ id: branches.id, name: branches.name })
      .from(branches)
      .where(eq(branches.tenantId, scope.tenantId!))
      .orderBy(branches.name),
  ]);

  // Per-branch shipment counts
  const branchCounts = await queryBranchShipmentCounts(filter);

  const byStatus: Record<string, number> = {
    in_transit: Number(s.inTransit ?? 0),
    out_for_delivery: Number(s.outForDelivery ?? 0),
    delivered: Number(s.delivered ?? 0),
    exception: Number(s.exceptions ?? 0),
    pending: Number(s.pending ?? 0),
    info_received: Number(s.infoReceived ?? 0),
    expired: Number(s.expired ?? 0),
    failed_attempt: 0,
  };

  const qt = Number(qRow.total ?? 0);
  const qc = Number(qRow.converted ?? 0);
  const conversionRate = computeConversionRate(qt, qc);

  const branchName = scope.branchId
    ? (bRow.find((b) => b.id === scope.branchId)?.name ?? null)
    : null;

  return {
    role,
    scope: { tenantId: scope.tenantId, branchId: scope.branchId ?? null },
    shipments: {
      total: Number(s.total ?? 0),
      inTransit: Number(s.inTransit ?? 0),
      outForDelivery: Number(s.outForDelivery ?? 0),
      deliveredToday: Number(s.deliveredToday ?? 0),
      deliveredThisMonth: Number(s.deliveredThisMonth ?? 0),
      exceptions: Number(s.exceptions ?? 0),
      pending: Number(s.pending ?? 0),
      stale: Number(s.stale ?? 0),
      overdue: Number(s.overdue ?? 0),
      notTracked: Number(s.notTracked ?? 0),
      byStatus,
      perDay: pdVal,
      byCarrier: bcVal,
      byBranch: bRow.map((b) => ({
        branch: b.name,
        count: branchCounts.find((c) => c.branchId === b.id)?.count ?? 0,
      })),
    },
    customers: { total: Number(cRow.total ?? 0), active: Number(cRow.active ?? 0) },
    quotations: { total: qt, converted: qc, conversionRate },
    invoices: {
      total: Number(iRow.total ?? 0),
      revenueThisMonth: (iRow.revenueThisMonth as string) ?? '0',
      revenueTotal: (iRow.revenueTotal as string) ?? '0',
    },
    revenuePerMonth: rmVal,
    perDay: pdVal,
    branches: { total: bRow.length },
    alerts: alVal,
    total: {
      shipments: {
        total: Number(s.total ?? 0),
        inTransit: Number(s.inTransit ?? 0),
        deliveredToday: Number(s.deliveredToday ?? 0),
        exceptions: Number(s.exceptions ?? 0),
      },
      customers: { total: Number(cRow.total ?? 0), active: Number(cRow.active ?? 0) },
      quotations: { total: qt, conversionRate },
      invoices: {
        total: Number(iRow.total ?? 0),
        revenueThisMonth: (iRow.revenueThisMonth as string) ?? '0',
        revenueTotal: (iRow.revenueTotal as string) ?? '0',
      },
    },
    perBranch:
      scope.branchId && branchName
        ? [
            {
              branchId: scope.branchId,
              branchName,
              shipments: {
                total: Number(s.total ?? 0),
                inTransit: Number(s.inTransit ?? 0),
                deliveredToday: Number(s.deliveredToday ?? 0),
                exceptions: Number(s.exceptions ?? 0),
              },
              invoices: {
                revenueTotal: (iRow.revenueTotal as string) ?? '0',
                revenueThisMonth: (iRow.revenueThisMonth as string) ?? '0',
              },
              customers: { total: Number(cRow.total ?? 0), active: Number(cRow.active ?? 0) },
            },
          ]
        : [],
    perTenant: [],
  };
}

async function buildBranchAdminStats(tenantId: string | undefined) {
  if (!tenantId) throw new Error('tenantId required');
  const tFilter = makeRawShipmentFilter(tenantId!);
  const tWhere = makeRawShipmentWhere(tenantId!);

  const [s, cRow, qRow, iRow, pbVal, rmVal, pdVal, alVal] = await Promise.all([
    queryShipmentSummary(tenantId),
    queryCustomerCountRaw(tFilter),
    queryQuotationCountRaw(tWhere),
    queryRevenueStatsRaw(tFilter),
    queryPerBranchBreakdown(tenantId),
    queryRevenuePerMonthRaw(tFilter),
    queryPerDayShipmentsRaw(tFilter),
    queryAlertsRaw(tFilter),
  ]);

  const qt = Number(qRow.total ?? 0);
  const qc = Number(qRow.converted ?? 0);
  const conversionRate = computeConversionRate(qt, qc);

  return {
    role: 'tenant-admin',
    scope: {},
    total: {
      shipments: {
        total: Number(s.total ?? 0),
        inTransit: Number(s.inTransit ?? 0),
        deliveredToday: Number(s.deliveredToday ?? 0),
        exceptions: Number(s.exceptions ?? 0),
      },
      customers: { total: Number(cRow.total ?? 0), active: Number(cRow.active ?? 0) },
      quotations: { total: qt, conversionRate },
      invoices: {
        total: Number(iRow.total ?? 0),
        revenueThisMonth: (iRow.revenueThisMonth as string) ?? '0',
        revenueTotal: (iRow.revenueTotal as string) ?? '0',
      },
    },
    perBranch: pbVal,
    perDay: pdVal,
    revenuePerMonth: rmVal,
    alerts: alVal,
  };
}

async function buildSuperadminStats(filterTenantId: string | null) {
  const tFilter = makeRawShipmentFilter(filterTenantId ?? undefined);
  const tWhere = makeRawShipmentWhere(filterTenantId ?? undefined);

  const [s, cRow, qRow, iRow, ptVal, rmVal, pdVal, alVal] = await Promise.all([
    queryShipmentSummary(filterTenantId ?? undefined),
    queryCustomerCountRaw(tFilter),
    queryQuotationCountRaw(tWhere),
    queryRevenueStatsRaw(tFilter),
    queryPerTenantBreakdown(filterTenantId),
    queryRevenuePerMonthRaw(tFilter),
    queryPerDayShipmentsRaw(tFilter),
    queryAlertsRaw(tFilter),
  ]);

  const qt = Number(qRow.total ?? 0);
  const qc = Number(qRow.converted ?? 0);
  const conversionRate = computeConversionRate(qt, qc);

  return {
    role: 'superadmin',
    scope: {},
    total: {
      shipments: {
        total: Number(s.total ?? 0),
        inTransit: Number(s.inTransit ?? 0),
        deliveredToday: Number(s.deliveredToday ?? 0),
        exceptions: Number(s.exceptions ?? 0),
      },
      customers: { total: Number(cRow.total ?? 0), active: Number(cRow.active ?? 0) },
      quotations: { total: qt, conversionRate },
      invoices: {
        total: Number(iRow.total ?? 0),
        revenueThisMonth: (iRow.revenueThisMonth as string) ?? '0',
        revenueTotal: (iRow.revenueTotal as string) ?? '0',
      },
    },
    perTenant: ptVal,
    perDay: pdVal,
    revenuePerMonth: rmVal,
    alerts: alVal,
  };
}

app.get('/branches', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ data: [] });

  const rows = await withCache(
    tenantId!,
    'dashboard:branches',
    () =>
      db
        .select({ id: branches.id, name: branches.name })
        .from(branches)
        .where(eq(branches.tenantId, tenantId!))
        .orderBy(branches.name),
    300,
  );

  return c.json({ data: rows });
});

export default app;
