'use client';

import { useMemo } from 'react';
import { AlertTriangle, Building2, Truck } from 'lucide-react';
import { Button } from '@heroui/react';
import { BentoBoard } from '@/components/bento';
import { KpiCard } from '@/components/kpi-card';
import { TrackQuotaCard } from '@/components/track-quota-card';
import { AttentionPanel } from './attention-panel';
import { BreakdownList } from './breakdown-list';
import { CommandHeader } from './command-header';
import { RangeControl } from './range-control';
import { ShipmentTrendChart } from './shipment-trend-chart';
import { StatusDonut } from './status-donut';
import { KPI_ICONS } from './kpi-icons';
import type { Branch, ChartRange, KpiItem, Stats } from './types';
import {
  chartRangeDays,
  chartVolumeData,
  deliverySeries,
  pctStr,
  resolveSparklines,
  seriesTrend,
  statusLabel,
  trendDir,
} from './utils';

export function OperationalDashboard({
  stats,
  loading,
  error,
  role,
  isTenantAdmin,
  isStaff,
  userName,
  branchName,
  branches,
  branchFilter,
  onBranchChange,
  onRetry,
  range,
  onRangeChange,
}: {
  stats: Stats | null;
  loading: boolean;
  error: string | null;
  role: string;
  isTenantAdmin: boolean;
  isStaff: boolean;
  userName: string;
  branchName?: string;
  branches: Branch[];
  branchFilter: string;
  onBranchChange: (id: string) => void;
  onRetry: () => void;
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
}) {
  const rawPerDay = stats?.shipments?.perDay ?? [];
  const days = chartRangeDays(range);

  const sparks = useMemo(
    () => resolveSparklines(stats?.shipmentTrend, rawPerDay, days),
    [stats?.shipmentTrend, rawPerDay, days],
  );

  // Deliveries are a flow, so they get their own series instead of a created-cohort bucket.
  const deliverySpark = useMemo(() => deliverySeries(stats?.deliveryFlow, days), [stats?.deliveryFlow, days]);

  // One delta per tile, each from that tile's own series.
  const trends = useMemo(
    () => ({
      total: seriesTrend(sparks.total),
      inTransit: seriesTrend(sparks.inTransit),
      outForDelivery: seriesTrend(sparks.outForDelivery),
      delivered: seriesTrend(deliverySpark),
      exceptions: seriesTrend(sparks.exceptions),
    }),
    [sparks, deliverySpark],
  );

  if (error) {
    return (
      <div className="w-full flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-sm content-panel p-8">
          <AlertTriangle size={28} className="text-danger-soft-foreground mx-auto mb-3" />
          <h1 className="text-lg font-semibold mb-2 tracking-tight">Something went wrong</h1>
          <p className="text-sm text-muted mb-4">{error}</p>
          <Button variant="primary" onPress={() => onRetry()}>Try again</Button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const s = stats.shipments;
  if (!s) return null;

  // Bento Column: the headline metric takes the 2x2 square, In Transit and Out
  // for Delivery lock down the middle column, the status rail runs tall on the
  // right, and the bottom row carries the flow numbers and the breakdowns.
  const tiles = {
    total: {
      label: 'Total Shipments',
      value: s.total,
      image: KPI_ICONS.total.src,
      color: KPI_ICONS.total.accent,
      spark: sparks.total,
      href: '/shipments',
      trend: trendDir(trends.total),
      trendValue: pctStr(trends.total),
      sublabel: `Last ${sparks.total.length} days`,
    },
    inTransit: {
      image: KPI_ICONS.inTransit.src,
      label: 'In Transit',
      value: s.inTransit,
      color: KPI_ICONS.inTransit.accent,
      href: '/shipments?status=In%20Transit',
      trend: trendDir(trends.inTransit),
      trendValue: pctStr(trends.inTransit),
      spark: sparks.inTransit,
      chart: 'line',
    },
    outForDelivery: {
      image: KPI_ICONS.outForDelivery.src,
      label: 'Out for Delivery',
      value: s.outForDelivery,
      color: KPI_ICONS.outForDelivery.accent,
      href: '/shipments?status=In%20Transit',
      trend: trendDir(trends.outForDelivery),
      trendValue: pctStr(trends.outForDelivery),
      spark: sparks.outForDelivery,
      chart: 'bars',
    },
    delivered: {
      image: KPI_ICONS.delivered.src,
      label: 'Delivered Today',
      value: s.deliveredToday,
      color: KPI_ICONS.delivered.accent,
      href: '/shipments?status=Delivered',
      trend: trendDir(trends.delivered),
      trendValue: pctStr(trends.delivered),
      spark: deliverySpark,
      chart: 'line',
    },
    exceptions: {
      image: KPI_ICONS.exceptions.src,
      label: 'Exceptions',
      value: s.exceptions,
      color: KPI_ICONS.exceptions.accent,
      href: '/shipments?status=Exception',
      trend: trendDir(trends.exceptions),
      trendValue: pctStr(trends.exceptions),
      spark: sparks.exceptions,
      chart: 'line',
      invertTrend: true,
    },
  } satisfies Record<string, KpiItem>;

  const donutData = Object.entries(s.byStatus)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: statusLabel(k), value: v }));

  const carrierData = (s.byCarrier ?? []).map((c) => ({ name: c.carrier, value: c.count }));
  const branchData = (s.byBranch ?? []).map((b) => ({ name: b.branch, value: b.count }));

  return (
    <div className="w-full space-y-7">
      <CommandHeader
        title={userName}
        roleLabel={role}
        branches={branches}
        branchFilter={branchFilter}
        showBranchFilter={isTenantAdmin}
        branchBadge={isStaff ? branchName : undefined}
        onBranchChange={onBranchChange}
        onRefresh={onRetry}
      />

      <RangeControl value={range} onChange={onRangeChange} />

      <AttentionPanel
        exceptions={s.exceptions}
        overdue={s.overdue}
        notTracked={s.notTracked}
        exceptionsDelta={trends.exceptions}
      />

      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted/70 px-0.5">
        Shipment Overview
      </h2>

      <BentoBoard>
        <KpiCard size="feature" {...tiles.total} revealDelay={180} />
        <KpiCard {...tiles.inTransit} revealDelay={240} />
        <StatusDonut data={donutData} total={s.total} />
        <KpiCard {...tiles.outForDelivery} revealDelay={300} />
        <KpiCard {...tiles.delivered} revealDelay={360} />
        <KpiCard {...tiles.exceptions} revealDelay={420} />
        <BreakdownList
          title="By Carrier"
          icon={Truck}
          items={carrierData}
          emptyLabel="No carrier data yet"
          limit={3}
          className={isTenantAdmin ? undefined : 'lg:col-span-2'}
        />
        {isTenantAdmin && (
          <BreakdownList
            title="By Branch"
            icon={Building2}
            items={branchData}
            emptyLabel="No branch data yet"
            limit={3}
          />
        )}
      </BentoBoard>

      <ShipmentTrendChart data={chartVolumeData(s.perDay, days)} />

      <div className="max-w-md">
        <TrackQuotaCard />
      </div>
    </div>
  );
}
