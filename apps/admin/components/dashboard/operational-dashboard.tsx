'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  Hourglass,
  Package,
  Truck,
  WifiOff,
} from 'lucide-react';
import { Button } from '@heroui/react';
import { TrackQuotaCard } from '@/components/track-quota-card';
import { AlertsPanel } from './alerts-panel';
import { BreakdownList } from './breakdown-list';
import { CommandHeader } from './command-header';
import { KpiGroup } from './kpi-stat-card';
import { ShipmentTrendChart } from './shipment-trend-chart';
import { StatusBreakdown } from './status-breakdown';
import { KPI_COLORS } from './kpi-colors';
import type { Branch, KpiItem, Stats, TickerItem } from './types';
import {
  chartVolumeData,
  fillDays,
  formatCurrency,
  pctStr,
  periodTrend,
  resolveSparklines,
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
  currencyCode,
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
  currencyCode?: string;
}) {
  const [chartRange] = useState<'1w' | '2w' | '1m'>('2w');

  const rawPerDay = stats?.shipments?.perDay ?? [];

  const areaData = useMemo(() => {
    if (!rawPerDay.length) return [];
    const days = { '1w': 7, '2w': 14, '1m': 30 }[chartRange] ?? 14;
    const calendar = fillDays(rawPerDay, days);
    if (calendar.some((d) => d.shipments > 0)) return calendar;
    return rawPerDay
      .map((d) => ({ date: String(d.date), shipments: Number(d.count) || 0 }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-days);
  }, [rawPerDay, chartRange]);

  const sparks = useMemo(
    () => resolveSparklines(stats?.shipmentTrend, rawPerDay),
    [stats?.shipmentTrend, rawPerDay],
  );

  const trendPct = useMemo(() => periodTrend(areaData), [areaData]);

  if (error) {
    return (
      <div className="w-full flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-sm content-panel p-8">
          <AlertTriangle size={28} className="text-danger mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-2 tracking-tight">Something went wrong</h2>
          <p className="text-sm text-muted mb-4">{error}</p>
          <Button variant="primary" onPress={() => onRetry()}>Try again</Button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const s = stats.shipments;
  if (!s) return null;
  const fmt = (v: string) => formatCurrency(v, currencyCode);

  const ticker: TickerItem[] = [
    { label: 'in transit', value: s.inTransit },
    { label: 'delivered today', value: s.deliveredToday },
    { label: 'exceptions', value: s.exceptions },
  ];
  if (!isStaff) {
    ticker.push({ label: 'revenue this month', value: fmt(stats.invoices?.revenueThisMonth ?? '0') });
  }

  const activeKpis: KpiItem[] = [
    {
      icon: <Truck size={18} />,
      label: 'In Transit',
      value: s.inTransit,
      color: KPI_COLORS.inTransit,
      href: '/shipments?status=in_transit',
      trend: trendDir(trendPct),
      trendValue: pctStr(trendPct),
      spark: sparks.inTransit,
      chart: 'line',
    },
    {
      icon: <Package size={18} />,
      label: 'Out for Delivery',
      value: s.outForDelivery,
      color: KPI_COLORS.outForDelivery,
      href: '/shipments?status=out_for_delivery',
      trend: trendDir(trendPct),
      trendValue: pctStr(trendPct),
      spark: sparks.outForDelivery,
      chart: 'bars',
    },
    {
      icon: <CheckCircle size={18} />,
      label: 'Delivered Today',
      value: s.deliveredToday,
      color: KPI_COLORS.delivered,
      href: '/shipments?status=delivered',
      trend: trendDir(trendPct),
      trendValue: pctStr(trendPct),
      spark: sparks.delivered,
      chart: 'line',
    },
  ];

  const problemKpis: KpiItem[] = [
    {
      icon: <AlertTriangle size={18} />,
      label: 'Exceptions',
      value: s.exceptions,
      color: KPI_COLORS.exceptions,
      href: '/shipments?status=exception',
      trend: trendDir(trendPct ? -trendPct : null),
      trendValue: pctStr(trendPct ? -trendPct : null),
      spark: sparks.exceptions,
      chart: 'bars',
    },
    {
      icon: <Hourglass size={18} />,
      label: 'Overdue',
      value: s.overdue,
      color: KPI_COLORS.overdue,
      sublabel: 'past ETA',
      trend: 'neutral',
      trendValue: '—',
      spark: [s.overdue, Math.max(s.total - s.overdue, 1)],
      chart: 'donut',
    },
    {
      icon: <WifiOff size={18} />,
      label: 'Not Tracked',
      value: s.notTracked,
      color: KPI_COLORS.notTracked,
      sublabel: 'not registered',
      trend: 'neutral',
      trendValue: '—',
      spark: [s.notTracked, Math.max(s.total - s.notTracked, 1)],
      chart: 'donut',
    },
  ];

  const donutData = Object.entries(s.byStatus)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: statusLabel(k), value: v }));

  const carrierData = (s.byCarrier ?? []).map((c) => ({ name: c.carrier, value: c.count }));
  const branchData = (s.byBranch ?? []).map((b) => ({ name: b.branch, value: b.count }));

  return (
    <div className="w-full space-y-5">
      <CommandHeader
        title={userName}
        roleLabel={role}
        ticker={ticker}
        branches={branches}
        branchFilter={branchFilter}
        showBranchFilter={isTenantAdmin}
        branchBadge={isStaff ? branchName : undefined}
        onBranchChange={onBranchChange}
        onRefresh={onRetry}
      />

      <KpiGroup title="Active Shipments" items={activeKpis} />
      <KpiGroup title="Needs Attention" items={problemKpis} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          <ShipmentTrendChart data={chartVolumeData(s.perDay, 30)} />
        </div>
        <div className="lg:col-span-4">
          <StatusBreakdown data={donutData} />
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${isTenantAdmin ? 'lg:grid-cols-2' : ''}`}>
        <BreakdownList title="By Carrier" icon={Truck} items={carrierData} emptyLabel="No carrier data yet" />
        {isTenantAdmin && (
          <BreakdownList title="By Branch" icon={Building2} items={branchData} emptyLabel="No branch data yet" />
        )}
      </div>

      <AlertsPanel alerts={stats.alerts} />

      <div className="max-w-md">
        <TrackQuotaCard />
      </div>
    </div>
  );
}
