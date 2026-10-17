'use client';

import { useMemo } from 'react';
import { Package, Truck, CheckCircle } from 'lucide-react';
import { BentoBoard } from '@/components/bento';
import { KpiCard, type KpiCardProps } from '@/components/kpi-card';
import { pctStr, resolveSparklines, seriesTrend, trendDir } from '@/components/dashboard/utils';
import { useShipmentTrend } from '@/lib/queries';

interface ShipmentsKpiRowProps {
  counts: Record<string, number>;
  statusFilter: string;
  onStatusFilter: (group: string) => void;
}

/**
 * The shipments filter strip: a 1x3 board carrying the three stages of the
 * journey — added, moving, arrived. Each tile is also the filter for its own
 * status group, so the strip and the table share one selection.
 */
export function ShipmentsKpiRow({ counts, statusFilter, onStatusFilter }: ShipmentsKpiRowProps) {
  const { data: trendData = [] } = useShipmentTrend();

  // The same series builder the dashboards use: the calendar window first, then
  // the most recent days that actually carry data. Without the fallback a spell
  // with no new shipments zeroes the window and every tile silently drops its
  // chart, because `hasSeriesSignal` reads an all-zero series as no signal.
  const sparklines = useMemo(() => resolveSparklines(trendData, undefined), [trendData]);

  const trends = useMemo(
    () => ({
      total: seriesTrend(sparklines.total),
      inTransit: seriesTrend(sparklines.inTransit),
      delivered: seriesTrend(sparklines.delivered),
    }),
    [sparklines],
  );

  const tiles: { key: string; props: KpiCardProps }[] = [
    {
      key: 'all',
      props: {
        label: 'Total',
        value: counts.total ?? 0,
        color: '#8DC63F',
        icon: Package,
        spark: sparklines.total,
        chart: 'line',
        trend: trendDir(trends.total),
        trendValue: pctStr(trends.total),
        onPress: () => onStatusFilter('all'),
        isActive: statusFilter === 'all',
      },
    },
    {
      key: 'in-transit',
      props: {
        label: 'In Transit',
        value: counts['In Transit'] ?? 0,
        color: '#A2D145',
        icon: Truck,
        spark: sparklines.inTransit,
        chart: 'line',
        trend: trendDir(trends.inTransit),
        trendValue: pctStr(trends.inTransit),
        onPress: () => onStatusFilter('In Transit'),
        isActive: statusFilter === 'In Transit',
      },
    },
    {
      key: 'delivered',
      props: {
        label: 'Delivered',
        value: counts.Delivered ?? 0,
        color: '#7CB342',
        icon: CheckCircle,
        spark: sparklines.delivered,
        chart: 'line',
        trend: trendDir(trends.delivered),
        trendValue: pctStr(trends.delivered),
        onPress: () => onStatusFilter('Delivered'),
        isActive: statusFilter === 'Delivered',
      },
    },
  ];

  return (
    <BentoBoard columns={3}>
      {tiles.map((t) => (
        <KpiCard key={t.key} {...t.props} />
      ))}
    </BentoBoard>
  );
}
