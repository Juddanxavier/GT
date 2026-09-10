'use client';

import { useMemo } from 'react';
import { Package, Truck, CheckCircle, Clock } from 'lucide-react';
import { KpiCard } from '@/components/kpi-card';
import { useShipmentTrend } from '@/lib/queries';

interface ShipmentsKpiRowProps {
  counts: Record<string, number>;
  statusFilter: string;
  onStatusFilter: (group: string) => void;
}

export function ShipmentsKpiRow({ counts, statusFilter, onStatusFilter }: ShipmentsKpiRowProps) {
  const { data: trendData = [] } = useShipmentTrend();

  const sparklines = useMemo(() => {
    const map = new Map(trendData.map((r) => [r.date, r]));
    const days = 14;
    const now = new Date();
    const total: number[] = [];
    const inTransit: number[] = [];
    const delivered: number[] = [];
    const pending: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const row = map.get(key);
      total.push(row?.total ?? 0);
      inTransit.push(row?.intransit ?? 0);
      delivered.push(row?.delivered ?? 0);
      pending.push(row?.pending ?? 0);
    }
    return { total, inTransit, delivered, pending };
  }, [trendData]);

  const trend = useMemo(() => {
    const calc = (data: number[]) => {
      if (data.length < 14) return 0;
      const prev = data.slice(0, 7).reduce((a, b) => a + b, 0);
      const curr = data.slice(7).reduce((a, b) => a + b, 0);
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };
    return {
      total: calc(sparklines.total),
      inTransit: calc(sparklines.inTransit),
      delivered: calc(sparklines.delivered),
      pending: calc(sparklines.pending),
    };
  }, [sparklines]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <KpiCard
        label="Total"
        count={counts.total ?? 0}
        color="#3b82f6"
        icon={Package}
        data={sparklines.total}
        trend={trend.total}
        onPress={() => onStatusFilter('all')}
        isActive={statusFilter === 'all'}
      />
      <KpiCard
        label="In Transit"
        count={counts['In Transit'] ?? 0}
        color="#8b5cf6"
        icon={Truck}
        data={sparklines.inTransit}
        trend={trend.inTransit}
        onPress={() => onStatusFilter('In Transit')}
        isActive={statusFilter === 'In Transit'}
      />
      <KpiCard
        label="Delivered"
        count={counts.Delivered ?? 0}
        color="#22c55e"
        icon={CheckCircle}
        data={sparklines.delivered}
        trend={trend.delivered}
        onPress={() => onStatusFilter('Delivered')}
        isActive={statusFilter === 'Delivered'}
      />
      <KpiCard
        label="Pending"
        count={counts.Pending ?? 0}
        color="#f59e0b"
        icon={Clock}
        data={sparklines.pending}
        trend={trend.pending}
        onPress={() => onStatusFilter('Pending')}
        isActive={statusFilter === 'Pending'}
      />
    </div>
  );
}
