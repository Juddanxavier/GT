'use client';

import { useMemo } from 'react';
import { BentoBoard } from '@/components/bento';
import { KpiCard } from '@/components/kpi-card';
import { TrackQuotaCard } from '@/components/track-quota-card';
import { AttentionPanel } from './attention-panel';
import { BusinessOverview } from './business-overview';
import { CommandHeader } from './command-header';
import { PerEntityTable } from './per-entity-table';
import { RangeControl } from './range-control';
import { ShipmentTrendChart } from './shipment-trend-chart';
import { StatusDonut } from './status-donut';
import { KPI_ICONS } from './kpi-icons';
import type { ChartRange, KpiItem, Stats } from './types';
import {
  chartRangeDays,
  chartVolumeData,
  deliverySeries,
  pctStr,
  resolveShipments,
  resolveSparklines,
  seriesTrend,
  statusLabel,
  trendDir,
} from './utils';

export function SuperadminDashboard({
  stats,
  onRetry,
  isTenantScoped,
  range,
  onRangeChange,
  tenantCurrency,
  isSingleTenant,
}: {
  stats: Stats;
  onRetry: () => void;
  isTenantScoped?: boolean;
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
  /** Tenant currency code for the business revenue tile. */
  tenantCurrency?: string;
  /** True when one tenant backs the page, so the business tiles can link. */
  isSingleTenant?: boolean;
}) {
  const t = stats.total!;
  const shipments = resolveShipments(stats);
  const rawPerDay = stats.perDay ?? shipments.perDay ?? [];
  const days = chartRangeDays(range);
  const perDayForChart = chartVolumeData(rawPerDay, days);
  const sparks = useMemo(
    () => resolveSparklines(stats.shipmentTrend, rawPerDay, days),
    [stats.shipmentTrend, rawPerDay, days],
  );

  // Deliveries are a flow, so they get their own series instead of a created-cohort bucket.
  const deliverySpark = useMemo(() => deliverySeries(stats.deliveryFlow, days), [stats.deliveryFlow, days]);

  // One delta per tile, each from that tile's own series.
  const trends = useMemo(
    () => ({
      inTransit: seriesTrend(sparks.inTransit),
      delivered: seriesTrend(deliverySpark),
      total: seriesTrend(sparks.total),
      exceptions: seriesTrend(sparks.exceptions),
    }),
    [sparks, deliverySpark],
  );

  // Bento Column, superadmin edition: Total takes the 2x2 square, In Transit and
  // Delivered Today take the middle column, and the status rail runs tall.
  const tiles = {
    total: {
      label: 'Total Shipments',
      value: t.shipments.total,
      image: KPI_ICONS.total.src,
      color: KPI_ICONS.total.accent,
      spark: sparks.total,
      trend: trendDir(trends.total),
      trendValue: pctStr(trends.total),
      sublabel: isTenantScoped ? 'across all branches' : 'across all tenants',
    },
    inTransit: {
      image: KPI_ICONS.inTransit.src,
      label: 'In Transit',
      value: t.shipments.inTransit,
      color: KPI_ICONS.inTransit.accent,
      trend: trendDir(trends.inTransit),
      trendValue: pctStr(trends.inTransit),
      spark: sparks.inTransit,
      chart: 'line',
    },
    delivered: {
      image: KPI_ICONS.delivered.src,
      label: 'Delivered Today',
      value: t.shipments.deliveredToday,
      color: KPI_ICONS.delivered.accent,
      trend: trendDir(trends.delivered),
      trendValue: pctStr(trends.delivered),
      spark: deliverySpark,
      chart: 'bars',
    },
  } satisfies Record<string, KpiItem>;

  const donutData = Object.entries(shipments.byStatus)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: statusLabel(k), value: v }));

  const tableMode = isTenantScoped ? 'branch' : 'tenant';

  return (
    <div className="w-full space-y-7">
      <CommandHeader
        title={isTenantScoped ? 'Admin Overview' : 'Super Admin'}
        roleLabel={isTenantScoped ? 'tenant-admin' : 'superadmin'}
        onRefresh={onRetry}
      />

      <RangeControl value={range} onChange={onRangeChange} />

      <AttentionPanel
        exceptions={shipments.exceptions}
        overdue={shipments.overdue}
        notTracked={shipments.notTracked}
        exceptionsDelta={trends.exceptions}
      />

      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted/70 px-0.5">
        Shipment Overview
      </h2>

      <BentoBoard>
        <KpiCard size="feature" {...tiles.total} revealDelay={180} />
        <KpiCard {...tiles.inTransit} revealDelay={240} />
        <StatusDonut data={donutData} total={t.shipments.total} />
        <KpiCard {...tiles.delivered} revealDelay={300} />
      </BentoBoard>

      <BusinessOverview
        stats={stats}
        tenantCurrency={tenantCurrency}
        isSingleTenant={!!isSingleTenant}
      />

      <ShipmentTrendChart
        data={perDayForChart}
        title={isTenantScoped ? 'Shipments — All Branches' : 'Shipments — All Tenants'}
      />

      <PerEntityTable
        mode={tableMode}
        perBranch={stats.perBranch}
        perTenant={stats.perTenant}
      />

      <div className="max-w-md">
        <TrackQuotaCard />
      </div>
    </div>
  );
}
