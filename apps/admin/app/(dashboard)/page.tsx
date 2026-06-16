'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck, Package, CheckCircle, AlertTriangle, IndianRupee, TrendingUp,
  Clock, CalendarClock, CheckCircle2, Wifi, WifiOff, RefreshCw,
  ArrowRight, Users, FileText, Building2,
} from 'lucide-react';
import { Button, Card } from '@heroui/react';
import { DonutChart, BarList, CategoryBar, ProgressBar, AreaChart } from '@tremor/react';
import { authClient } from '@/lib/auth-client';
import { api, ApiError } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';

type Stats = {
  role: string;
  scope: Record<string, string | null>;
  shipments: {
    total: number; inTransit: number; outForDelivery: number;
    deliveredToday: number; deliveredThisMonth: number;
    exceptions: number; pending: number;
    stale: number; overdue: number; notTracked: number;
    byStatus: Record<string, number>;
    perDay: { date: string; count: number }[];
    byCarrier: { carrier: string; count: number }[];
  };
  customers: { total: number; active: number };
  quotations: { total: number; converted: number; conversionRate: number };
  invoices: { total: number; revenueThisMonth: string; revenueTotal: string };
  branches: { total: number };
  alerts: Alert[];
  total?: SuperTotal;
  perTenant?: PerTenant[];
  perDay?: { date: string; count: number }[];
};

type SuperTotal = {
  shipments: { total: number; inTransit: number; deliveredToday: number; exceptions: number };
  customers: { total: number; active: number };
  quotations: { total: number; conversionRate: number };
  invoices: { total: number; revenueThisMonth: string; revenueTotal: string };
};

type PerTenant = {
  tenantId: string; tenantName: string;
  shipments: { total: number; inTransit: number; deliveredToday: number; exceptions: number };
  invoices: { revenueTotal: string; revenueThisMonth: string };
  branches: { total: number };
};

type Alert = {
  type: 'stale' | 'overdue' | 'exception' | 'unknown';
  shipmentId: string; trackingNo: string; status: string;
  lastTrackedAt?: string; estimatedDelivery?: string; updatedAt?: string;
};

type Branch = { id: string; name: string };

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function statusLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(v: string): string {
  const n = Number(v);
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString()}`;
}

const ACCENTS = ['amber', 'blue', 'green', 'red', 'emerald', 'violet'] as const;

function KpiCard({
  icon, label, value, href, accent,
}: {
  icon: React.ReactNode; label: string; value: string | number; href?: string; accent: string;
}) {
  const gradientMap: Record<string, string> = {
    amber: 'from-amber-500/10 to-amber-500/5 border-l-amber-500',
    blue: 'from-blue-500/10 to-blue-500/5 border-l-blue-500',
    green: 'from-green-500/10 to-green-500/5 border-l-green-500',
    red: 'from-red-500/10 to-red-500/5 border-l-red-500',
    emerald: 'from-emerald-500/10 to-emerald-500/5 border-l-emerald-500',
    violet: 'from-violet-500/10 to-violet-500/5 border-l-violet-500',
  };
  const iconBgMap: Record<string, string> = {
    amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    green: 'bg-green-500/15 text-green-600 dark:text-green-400',
    red: 'bg-red-500/15 text-red-600 dark:text-red-400',
    emerald: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    violet: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  };
  const bg = gradientMap[accent] ?? 'from-gray-500/10 to-gray-500/5 border-l-gray-500';
  const icBg = iconBgMap[accent] ?? 'bg-gray-500/15 text-gray-600';

  const cls = `block rounded-2xl border-l-4 bg-gradient-to-br ${bg} p-5 transition-all hover:-translate-y-1 hover:shadow-lg`;
  const inner = (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${icBg}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="text-xs font-medium text-muted mt-1">{label}</p>
    </>
  );
  if (href) return <a href={href} className={cls}>{inner}</a>;
  return <div className={cls}>{inner}</div>;
}

function LiveDot({ online }: { online: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${online ? 'text-green-500' : 'text-gray-400'}`}>
      <span className={`relative inline-flex w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-gray-400'}`}>
        {online && <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />}
      </span>
      {online ? 'Live' : 'Disconnected'}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState('');

  const fetchStats = useCallback(async (branchId?: string) => {
    try {
      setError(null);
      const qs = branchId ? `?branchId=${branchId}` : '';
      const res = await api.get<Stats>(`/api/dashboard/stats${qs}`);
      setStats(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPending || !session) return;
    const tenantId = (session.user as Record<string, unknown>).tenantId as string;
    const role = (session.user as Record<string, unknown>).role as string;

    fetchStats();

    if (role === 'tenant-admin') {
      api.get<{ data: Branch[] }>('/api/dashboard/branches').then((r) => setBranches(r.data ?? [])).catch(() => {});
    }

    const socket = connectSocket(tenantId);
    socket.on('connect', () => setLive(true));
    socket.on('disconnect', () => setLive(false));
    socket.on('dashboard:update', () => fetchStats(branchFilter || undefined));
    setLive(socket.connected);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('dashboard:update');
    };
  }, [session, isPending, fetchStats, branchFilter]);

  if (isPending) {
    return (
      <div className="w-full space-y-6">
        <div className="h-32 rounded-2xl bg-surface animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-surface animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="h-64 rounded-2xl bg-surface animate-pulse lg:col-span-2" />
          <div className="h-64 rounded-2xl bg-surface animate-pulse" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  const user = session.user as Record<string, unknown>;
  const role = user.role as string;
  const tenantId = user.tenantId as string | undefined;
  const branchName = user.branchName as string | undefined;
  const userName = (user.name as string) || (user.email as string) || 'User';

  const isSuperadmin = role === 'superadmin';
  const isTenantAdmin = role === 'tenant-admin';
  const isStaff = role === 'staff';

  if (isSuperadmin && stats?.total) {
    return <SuperadminDashboard stats={stats} live={live} onRetry={fetchStats} />;
  }

  return (
    <OperationalDashboard
      stats={stats}
      loading={loading}
      error={error}
      live={live}
      role={role}
      isTenantAdmin={isTenantAdmin}
      isStaff={isStaff}
      userName={userName}
      branchName={branchName}
      branches={branches}
      branchFilter={branchFilter}
      onBranchChange={setBranchFilter}
      onRetry={fetchStats}
      router={router}
    />
  );
}

function SuperadminDashboard({ stats, live, onRetry }: { stats: Stats; live: boolean; onRetry: () => void }) {
  const t = stats.total!;

  return (
    <div className="w-full space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-white">System Overview</h1>
            <p className="text-sm text-white/70 flex items-center gap-2">
              {timeGreeting()} · <LiveDot online={live} />
            </p>
          </div>
          <Button isIconOnly variant="ghost" onPress={() => onRetry()} className="text-white/70 hover:text-white"><RefreshCw size={16} /></Button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          <SuperStatCard label="Total Shipments" value={t.shipments.total} sub="across all tenants" />
          <SuperStatCard label="Total Revenue" value={formatCurrency(t.invoices.revenueTotal)} sub="lifetime" />
          <SuperStatCard label="Active Customers" value={t.customers.active} sub="registered" />
          <SuperStatCard label="Avg. Conversion" value={`${t.quotations.conversionRate}%`} sub="quote-to-ship" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <Card.Header>
            <Card.Title className="text-base font-semibold">Per-Tenant Breakdown</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted border-b border-border">
                    <th className="pb-3 font-medium">Tenant</th>
                    <th className="pb-3 font-medium text-right">Shipments</th>
                    <th className="pb-3 font-medium text-right">In Transit</th>
                    <th className="pb-3 font-medium text-right">Delivered Today</th>
                    <th className="pb-3 font-medium text-right">Revenue</th>
                    <th className="pb-3 font-medium text-right">Branches</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats.perTenant ?? []).map((pt) => (
                    <tr key={pt.tenantId} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="py-3 font-medium">{pt.tenantName}</td>
                      <td className="py-3 text-right">{pt.shipments.total}</td>
                      <td className="py-3 text-right text-amber-600 dark:text-amber-400 font-medium">{pt.shipments.inTransit}</td>
                      <td className="py-3 text-right text-green-600 dark:text-green-400 font-medium">{pt.shipments.deliveredToday}</td>
                      <td className="py-3 text-right">{formatCurrency(pt.invoices.revenueTotal)}</td>
                      <td className="py-3 text-right">{pt.branches.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Content>
        </Card>
        <ActionCard />
      </div>

      {stats.perDay && stats.perDay.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title className="text-base font-semibold">Shipments per Day — All Tenants</Card.Title>
          </Card.Header>
          <Card.Content>
            <AreaChart
              data={stats.perDay.map((d) => ({ date: d.date, shipments: d.count }))}
              index="date"
              categories={['shipments']}
              colors={['blue']}
              valueFormatter={(n) => n.toString()}
              showGradient
              className="h-64"
            />
          </Card.Content>
        </Card>
      )}

      {renderAlerts(stats.alerts)}
    </div>
  );
}

function SuperStatCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur-sm p-4">
      <p className="text-xs font-medium text-white/60 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      <p className="text-xs text-white/40 mt-0.5">{sub}</p>
    </div>
  );
}

function OperationalDashboard({
  stats, loading, error, live, role, isTenantAdmin, isStaff, userName, branchName,
  branches, branchFilter, onBranchChange, onRetry, router,
}: {
  stats: Stats | null; loading: boolean; error: string | null; live: boolean;
  role: string; isTenantAdmin: boolean; isStaff: boolean; userName: string; branchName?: string;
  branches: Branch[]; branchFilter: string; onBranchChange: (v: string) => void;
  onRetry: () => void; router: ReturnType<typeof useRouter>;
}) {
  if (error) {
    return (
      <div className="w-full flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-danger/10 text-danger mb-4">
            <AlertTriangle size={28} />
          </div>
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-muted mb-4">{error}</p>
          <Button variant="primary" onPress={() => onRetry()}>Try again</Button>
        </div>
      </div>
    );
  }

  if (loading || !stats) {
    return (
      <div className="w-full space-y-6">
        <div className="h-32 rounded-2xl bg-surface animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-surface animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="h-64 rounded-2xl bg-surface animate-pulse lg:col-span-2" />
          <div className="h-64 rounded-2xl bg-surface animate-pulse" />
        </div>
      </div>
    );
  }

  const s = stats.shipments;
  const totalActive = s.inTransit + s.outForDelivery + s.deliveredToday;
  const statusValues = [
    s.deliveredToday,
    s.outForDelivery,
    s.inTransit,
    s.pending,
    s.exceptions,
  ];
  const statusColors: Array<'green' | 'blue' | 'amber' | 'gray' | 'red'> = [
    'green', 'blue', 'amber', 'gray', 'red',
  ];

  const cards = [
    { icon: <Truck size={18} />, label: 'In Transit', value: s.inTransit, accent: 'amber', href: '/shipments?status=in_transit' },
    { icon: <Package size={18} />, label: 'Out for Delivery', value: s.outForDelivery, accent: 'blue', href: '/shipments?status=out_for_delivery' },
    { icon: <CheckCircle size={18} />, label: 'Delivered Today', value: s.deliveredToday, accent: 'green', href: '/shipments?status=delivered' },
    { icon: <AlertTriangle size={18} />, label: 'Exceptions', value: s.exceptions, accent: 'red', href: '/shipments?status=exception' },
    { icon: <IndianRupee size={18} />, label: 'Revenue This Month', value: formatCurrency(stats.invoices.revenueThisMonth), accent: 'emerald' },
    { icon: <TrendingUp size={18} />, label: 'Quote Conversion', value: `${stats.quotations.conversionRate}%`, accent: 'violet' },
  ];

  const donutData = Object.entries(s.byStatus)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: statusLabel(k), value: v }));

  const areaData = (s.perDay ?? []).map((d) => ({ date: d.date, shipments: d.count }));

  const carrierData = (s.byCarrier ?? []).map((c) => ({
    name: c.carrier,
    value: c.count,
  }));

  return (
    <div className="w-full space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-surface to-primary/[0.02] border border-border p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{timeGreeting()}, {userName}</h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                {role.replace('-', ' ')}
              </span>
            </div>
            <p className="text-sm text-muted flex items-center gap-3">
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              <span className="opacity-40">·</span>
              <LiveDot online={live} />
              {isStaff && branchName && (
                <>
                  <span className="opacity-40">·</span>
                  <span className="px-2 py-0.5 rounded-md bg-muted text-xs">{branchName}</span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isTenantAdmin && branches.length > 0 && (
              <select
                value={branchFilter}
                onChange={(e) => onBranchChange(e.target.value)}
                className="h-9 w-40 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary text-foreground"
              >
                <option value="">All Branches</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            <Button isIconOnly variant="ghost" onPress={() => onRetry()}><RefreshCw size={16} /></Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <KpiCard key={c.label} icon={c.icon} label={c.label} value={c.value} href={c.href} accent={c.accent} />
        ))}
      </div>

      {/* Charts Row 1: Status, Carriers, Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Distribution */}
        {donutData.length > 0 && (
          <Card>
            <Card.Header>
              <Card.Title className="text-sm font-semibold">Status Distribution</Card.Title>
              <Card.Description className="text-xs text-muted">Current shipment statuses</Card.Description>
            </Card.Header>
            <Card.Content>
              <DonutChart
                data={donutData}
                index="name"
                category="value"
                valueFormatter={(n) => n.toString()}
                className="h-52"
              />
            </Card.Content>
          </Card>
        )}

        {/* Carrier Breakdown */}
        {carrierData.length > 0 && (
          <Card>
            <Card.Header>
              <Card.Title className="text-sm font-semibold">By Carrier</Card.Title>
              <Card.Description className="text-xs text-muted">Shipments per carrier</Card.Description>
            </Card.Header>
            <Card.Content>
              <BarList
                data={carrierData}
                valueFormatter={(n: number) => n.toString()}
                className="h-52"
              />
            </Card.Content>
          </Card>
        )}

        {/* Revenue & Conversion Metrics */}
        <Card>
          <Card.Header>
            <Card.Title className="text-sm font-semibold">Revenue & Conversion</Card.Title>
            <Card.Description className="text-xs text-muted">Financial overview</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-muted">Quote Conversion Rate</span>
                <span className="text-sm font-bold text-foreground">{stats.quotations.conversionRate}%</span>
              </div>
              <ProgressBar
                value={stats.quotations.conversionRate}
                color="violet"
                showAnimation
                className="h-2.5"
              />
              <p className="text-xs text-muted mt-1">
                {stats.quotations.converted} of {stats.quotations.total} quotes converted
              </p>
            </div>
            <div className="pt-3 border-t border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted">Revenue This Month</span>
                <span className="text-lg font-bold text-foreground">{formatCurrency(stats.invoices.revenueThisMonth)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Lifetime Revenue</span>
                <span className="text-sm font-semibold text-foreground">{formatCurrency(stats.invoices.revenueTotal)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-xs font-medium text-muted">Active Customers</span>
              <span className="text-sm font-semibold text-foreground">{stats.customers.active} / {stats.customers.total}</span>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Charts Row 2: Area Chart + Status CategoryBar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Shipments Trend */}
        {areaData.length > 0 && (
          <Card className="lg:col-span-2">
            <Card.Header>
              <Card.Title className="text-sm font-semibold">Shipments Trend (14 Days)</Card.Title>
              <Card.Description className="text-xs text-muted">Daily shipment volume</Card.Description>
            </Card.Header>
            <Card.Content>
              <AreaChart
                data={areaData}
                index="date"
                categories={['shipments']}
                colors={['blue']}
                valueFormatter={(n) => n.toString()}
                showGradient
                className="h-52"
              />
            </Card.Content>
          </Card>
        )}

        {/* Status Summary */}
        <Card>
          <Card.Header>
            <Card.Title className="text-sm font-semibold">Shipment Health</Card.Title>
            <Card.Description className="text-xs text-muted">Status distribution bar</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs text-muted mb-2">
                <span>Delivered Today</span>
                <span className="font-medium text-foreground">{s.deliveredToday}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted mb-2">
                <span>Out for Delivery</span>
                <span className="font-medium text-foreground">{s.outForDelivery}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted mb-2">
                <span>In Transit</span>
                <span className="font-medium text-foreground">{s.inTransit}</span>
              </div>
              <CategoryBar
                values={statusValues}
                colors={statusColors}
                showLabels={false}
                className="mt-3"
              />
            </div>
            <div className="pt-3 border-t border-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Stale (no update &gt;72h)
                </span>
                <span className="font-medium text-foreground">{s.stale}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  Overdue (past ETA)
                </span>
                <span className="font-medium text-foreground">{s.overdue}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Not Tracked (&gt;24h)
                </span>
                <span className="font-medium text-foreground">{s.notTracked}</span>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Alerts + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {renderAlerts(stats.alerts)}
        </div>
        <ActionCard router={router} onRetry={onRetry} />
      </div>
    </div>
  );
}

function ActionCard({ onRetry, router }: { onRetry?: () => void; router?: ReturnType<typeof useRouter> }) {
  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-sm font-semibold">Quick Actions</Card.Title>
        <Card.Description className="text-xs text-muted">Common tasks</Card.Description>
      </Card.Header>
      <Card.Content className="space-y-2">
        {router && (
          <>
            <QuickActionButton icon={<Package size={16} />} label="New Shipment" onClick={() => router.push('/shipments?status=pending')} />
            <QuickActionButton icon={<Users size={16} />} label="New Customer" onClick={() => router.push('/customers')} />
            <QuickActionButton icon={<FileText size={16} />} label="New Quotation" onClick={() => router.push('/quotations')} />
            <QuickActionButton icon={<Building2 size={16} />} label="All Shipments" onClick={() => router.push('/shipments')} />
          </>
        )}
        {onRetry && (
          <QuickActionButton icon={<RefreshCw size={16} />} label="Refresh Dashboard" onClick={onRetry} />
        )}
      </Card.Content>
    </Card>
  );
}

function QuickActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-foreground bg-muted/30 hover:bg-muted/60 transition-colors text-left"
    >
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      <ArrowRight size={14} className="text-muted shrink-0" />
    </button>
  );
}

function renderAlerts(alerts: Alert[]) {
  const iconMap: Record<string, React.ReactNode> = {
    stale: <Clock size={14} />,
    overdue: <CalendarClock size={14} />,
    exception: <AlertTriangle size={14} />,
  };
  const colorMap: Record<string, string> = {
    stale: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-l-amber-500',
    overdue: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-l-orange-500',
    exception: 'text-red-600 dark:text-red-400 bg-red-500/10 border-l-red-500',
  };
  const labelMap: Record<string, string> = {
    stale: 'Stale',
    overdue: 'Overdue',
    exception: 'Exception',
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-sm font-semibold">Alerts — Shipments Needing Attention</Card.Title>
        <Card.Description className="text-xs text-muted">
          {alerts.length > 0
            ? `${alerts.length} shipment${alerts.length > 1 ? 's' : ''} need attention`
            : 'All clear'}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm py-4">
            <CheckCircle2 size={18} />
            <span>No alerts — all shipments are on track</span>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 10).map((a) => {
              const desc = a.type === 'stale'
                ? `No update in ${a.lastTrackedAt ? Math.floor((Date.now() - new Date(a.lastTrackedAt).getTime()) / 86400000) : '?'} days`
                : a.type === 'overdue'
                  ? `ETA was ${a.estimatedDelivery ? new Date(a.estimatedDelivery).toLocaleDateString() : '?'}`
                  : `Status: ${statusLabel(a.status)}`;
              return (
                <a
                  key={a.shipmentId}
                  href={`/shipments/${a.shipmentId}`}
                  className={`flex items-center gap-3 text-sm px-4 py-3 rounded-xl border-l-4 transition-all hover:translate-x-0.5 ${colorMap[a.type] ?? 'text-gray-600 bg-gray-500/10 border-l-gray-500'}`}
                >
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 shrink-0">
                    {iconMap[a.type] ?? <AlertTriangle size={14} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-[10px] uppercase tracking-widest">{labelMap[a.type] ?? 'Alert'}</span>
                      <span className="font-mono font-semibold text-sm">{a.trackingNo}</span>
                    </div>
                    <p className="text-xs text-current/60 truncate mt-0.5">{desc}</p>
                  </div>
                  <ArrowRight size={14} className="text-current/40 shrink-0" />
                </a>
              );
            })}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
