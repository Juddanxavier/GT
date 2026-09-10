import type { ReactNode } from 'react';

export type Stats = {
  role: string;
  scope: Record<string, string | null>;
  shipments: {
    total: number;
    inTransit: number;
    outForDelivery: number;
    deliveredToday: number;
    deliveredThisMonth: number;
    exceptions: number;
    pending: number;
    stale: number;
    overdue: number;
    notTracked: number;
    byStatus: Record<string, number>;
    perDay: { date: string; count: number }[];
    byCarrier: { carrier: string; count: number }[];
    byBranch: { branch: string; count: number }[];
  };
  customers: { total: number; active: number };
  quotations: { total: number; converted: number; conversionRate: number };
  invoices: { total: number; revenueThisMonth: string; revenueTotal: string };
  revenuePerMonth: { month: string; revenue: number }[];
  branches: { total: number };
  alerts: Alert[];
  total?: SuperTotal;
  perTenant?: PerTenant[];
  perBranch?: PerBranch[];
  perDay?: { date: string; count: number }[];
  shipmentTrend?: ShipmentTrendRow[];
};

export type PerBranch = {
  branchId: string;
  branchName: string;
  shipments: { total: number; inTransit: number; deliveredToday: number; exceptions: number };
  invoices: { revenueTotal: string; revenueThisMonth: string };
  customers: { total: number; active: number };
};

export type SuperTotal = {
  shipments: { total: number; inTransit: number; deliveredToday: number; exceptions: number };
  customers: { total: number; active: number };
  quotations: { total: number; conversionRate: number };
  invoices: { total: number; revenueThisMonth: string; revenueTotal: string };
};

export type PerTenant = {
  tenantId: string;
  tenantName: string;
  shipments: { total: number; inTransit: number; deliveredToday: number; exceptions: number };
  invoices: { revenueTotal: string; revenueThisMonth: string };
  branches: { total: number };
};

export type Alert = {
  type: 'stale' | 'overdue' | 'exception' | 'unknown';
  shipmentId: string;
  trackingNo: string;
  status: string;
  lastTrackedAt?: string;
  estimatedDelivery?: string;
  updatedAt?: string;
};

export type Branch = { id: string; name: string };

export type ChartRange = '1w' | '2w' | '1m';

export type ShipmentTrendRow = {
  date: string;
  total: number;
  intransit: number;
  outfordelivery?: number;
  delivered: number;
  pending: number;
  exception?: number;
};

export type KpiItem = {
  icon: ReactNode;
  label: string;
  value: string | number;
  color?: string;
  sublabel?: string;
  href?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  spark?: number[];
  chart?: 'line' | 'bars' | 'donut';
};

export type TickerItem = {
  label: string;
  value: string | number;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'accent';
};
