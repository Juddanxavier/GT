'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck, Package, CheckCircle, AlertTriangle, IndianRupee, TrendingUp,
  Clock, CalendarClock, CheckCircle2, Wifi, WifiOff, RefreshCw,
  ArrowUpRight, ArrowDownRight, Plus, Users, FileText,
} from 'lucide-react';
import { Button, Card, Chip } from '@heroui/react';
import { DonutChart, BarChart } from '@tremor/react';
import { authClient } from '@/lib/auth-client';
import { api, ApiError } from '@/lib/api';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';

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

const accentBg = 'bg-accent/10 text-accent';
const kpiColors = [
  'bg-amber-500/10 text-amber-600',
  'bg-blue-500/10 text-blue-600',
  'bg-green-500/10 text-green-600',
  'bg-red-500/10 text-red-600',
  'bg-emerald-500/10 text-emerald-600',
  'bg-violet-500/10 text-violet-600',
];

function KpiCard({
  icon, label, value, subtitle, href, color, trend,
}: {
  icon: React.ReactNode; label: string; value: string | number; subtitle?: string; href?: string; color: string; trend?: { up: boolean; label: string };
}) {
  const inner = (
    <div className="group relative rounded-2xl bg-surface p-5 border border-border/50 shadow-sm hover:shadow-md hover:border-accent/20 transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-4">
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${color} ring-4 ring-white/50`}>
          {icon}
        </div>
        {trend && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${trend.up ? 'text-green-600' : 'text-red-500'}`}>
            {trend.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend.label}
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-muted mb-0.5">{label}</p>
      <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
    </div>
  );
  if (href) return <a href={href} className="block">{inner}</a>;
  return inner;
}

function StatBadge({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/5 border border-accent/10 text-xs">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold ${color ?? 'text-foreground'}`}>{value}</span>
    </div>
  );
}

function LiveDot({ online }: { online: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${online ? 'text-green-500' : 'text-muted'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
      {online ? 'Live' : 'Disconnected'}
    </span>
  );
}

function SkeletonBlock() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-surface p-5 border border-border/50 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 animate-pulse" />
            <div className="h-4 w-20 bg-accent/5 rounded animate-pulse" />
            <div className="h-8 w-16 bg-accent/10 rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-surface p-5 h-64 border border-border/50 animate-pulse" />
        <div className="rounded-2xl bg-surface p-5 h-64 border border-border/50 animate-pulse" />
      </div>
    </div>
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

  if (isPending) return <SkeletonBlock />;
  if (!session) return null;

  const user = session.user as Record<string, unknown>;
  const role = user.role as string;
  const tenantId = user.tenantId as string | undefined;
  const branchName = user.branchName as string | undefined;
  const userName = (user.name as string) || (user.email as string) || 'User';
  const tenantName = (user.tenantName as string) || '';

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
      tenantName={tenantName}
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
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Overview</h1>
          <p className="text-sm text-muted mt-1">Cross-tenant analytics <LiveDot online={live} /></p>
        </div>
        <Button isIconOnly variant="ghost" onPress={() => onRetry()} className="hover:bg-accent/10"><RefreshCw size={16} /></Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<Package size={20} />} label="Total Shipments" value={t.shipments.total} href="/shipments" color="bg-amber-500/10 text-amber-600" />
        <KpiCard icon={<IndianRupee size={20} />} label="Total Revenue" value={formatCurrency(t.invoices.revenueTotal)} color={accentBg} subtitle="Across all tenants" />
        <KpiCard icon={<CheckCircle size={20} />} label="Active Customers" value={t.customers.active} href="/customers" color="bg-sky-500/10 text-sky-600" />
        <KpiCard icon={<TrendingUp size={20} />} label="Avg. Conversion" value={`${t.quotations.conversionRate}%`} color="bg-violet-500/10 text-violet-600" subtitle={`${t.quotations.total} total quotes`} />
      </div>

      <Card className="border border-border/50 shadow-sm">
        <Card.Header>
          <Card.Title className="text-base font-semibold">Tenant Breakdown</Card.Title>
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
                {(stats.perTenant ?? []).map((pt, i) => (
                  <tr key={pt.tenantId} className={`border-b border-border/50 hover:bg-accent/5 transition-colors ${i % 2 === 0 ? 'bg-accent/[0.02]' : ''}`}>
                    <td className="py-3 font-medium">{pt.tenantName}</td>
                    <td className="py-3 text-right">{pt.shipments.total}</td>
                    <td className="py-3 text-right"><span className="text-amber-600 font-medium">{pt.shipments.inTransit}</span></td>
                    <td className="py-3 text-right text-green-600 font-medium">{pt.shipments.deliveredToday}</td>
                    <td className="py-3 text-right font-medium">{formatCurrency(pt.invoices.revenueTotal)}</td>
                    <td className="py-3 text-right"><span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 text-accent text-xs font-bold">{pt.branches.total}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card>

      {stats.perDay && stats.perDay.length > 0 && (
        <Card className="border border-border/50 shadow-sm">
          <Card.Header>
            <Card.Title className="text-base font-semibold">Daily Shipments — All Tenants</Card.Title>
          </Card.Header>
          <Card.Content>
            <BarChart
              data={stats.perDay.map((d) => ({ date: d.date, shipments: d.count }))}
              index="date"
              categories={['shipments']}
              colors={['emerald']}
              valueFormatter={(n) => n.toString()}
              className="h-64"
            />
          </Card.Content>
        </Card>
      )}

      {renderAlerts(stats.alerts)}
    </div>
  );
}

function OperationalDashboard({
  stats, loading, error, live, role, isTenantAdmin, isStaff, userName, tenantName, branchName,
  branches, branchFilter, onBranchChange, onRetry, router,
}: {
  stats: Stats | null; loading: boolean; error: string | null; live: boolean;
  role: string; isTenantAdmin: boolean; isStaff: boolean; userName: string; tenantName?: string; branchName?: string;
  branches: Branch[]; branchFilter: string; onBranchChange: (v: string) => void;
  onRetry: () => void; router: ReturnType<typeof useRouter>;
}) {
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <Button variant="primary" onPress={() => onRetry()}>Retry</Button>
        </div>
        <div className="rounded-2xl bg-surface p-12 text-center border border-border/50 shadow-sm">
          <AlertTriangle size={40} className="mx-auto text-danger mb-4" />
          <p className="text-muted mb-2">{error}</p>
          <p className="text-xs text-muted">Try refreshing or check your connection</p>
        </div>
      </div>
    );
  }

  if (loading || !stats) return <SkeletonBlock />;

  const s = stats.shipments;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {timeGreeting()}, <span className="text-accent">{userName}</span>
          </h1>
          <p className="text-sm text-muted flex items-center gap-2 mt-0.5">
            <LiveDot online={live} />
            {tenantName && <><span className="opacity-40">·</span><span>{tenantName}</span></>}
            {isStaff && branchName && <><span className="opacity-40">·</span><Chip size="sm" variant="soft" color="accent" className="h-5 text-[11px]">{branchName}</Chip></>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isTenantAdmin && branches.length > 0 && (
            <select
              value={branchFilter}
              onChange={(e) => onBranchChange(e.target.value)}
              className="h-9 rounded-xl border border-border bg-surface px-3 text-sm outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/30"
            >
              <option value="">All Branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <Button isIconOnly variant="ghost" onPress={() => onRetry()} className="hover:bg-accent/10"><RefreshCw size={16} /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={<Truck size={18} />} label="In Transit" value={s.inTransit} href="/shipments?status=in_transit" color="bg-amber-500/10 text-amber-600" />
        <KpiCard icon={<Package size={18} />} label="Out for Delivery" value={s.outForDelivery} href="/shipments?status=out_for_delivery" color="bg-blue-500/10 text-blue-600" />
        <KpiCard icon={<CheckCircle size={18} />} label="Delivered Today" value={s.deliveredToday} href="/shipments?status=delivered" color="bg-green-500/10 text-green-600" trend={{ up: true, label: `${s.deliveredThisMonth} this month` }} />
        <KpiCard icon={<AlertTriangle size={18} />} label="Exceptions" value={s.exceptions} href="/shipments?status=exception" color="bg-red-500/10 text-red-600" />
        <KpiCard icon={<IndianRupee size={18} />} label="Revenue (Month)" value={formatCurrency(stats.invoices.revenueThisMonth)} color={accentBg} subtitle={`${stats.invoices.total} invoices`} />
        <KpiCard icon={<TrendingUp size={18} />} label="Quote Conversion" value={`${stats.quotations.conversionRate}%`} color="bg-violet-500/10 text-violet-600" subtitle={`${stats.quotations.converted}/${stats.quotations.total} won`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="flex flex-wrap gap-2">
          <StatBadge label="Total" value={s.total} color="text-accent font-bold" />
          <StatBadge label="Stale" value={s.stale} color={s.stale > 0 ? 'text-amber-600 font-bold' : ''} />
          <StatBadge label="Overdue" value={s.overdue} color={s.overdue > 0 ? 'text-orange-600 font-bold' : ''} />
          <StatBadge label="Pending" value={s.pending} />
          <StatBadge label="Not Tracked" value={s.notTracked} color={s.notTracked > 0 ? 'text-red-500 font-bold' : ''} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Object.entries(s.byStatus).filter(([, v]) => v > 0).length > 0 && (
          <Card className="border border-border/50 shadow-sm">
            <Card.Header>
              <Card.Title className="text-sm font-semibold">Status Distribution</Card.Title>
            </Card.Header>
            <Card.Content>
              <DonutChart
                data={Object.entries(s.byStatus).filter(([, v]) => v > 0).map(([k, v]) => ({ name: statusLabel(k), value: v }))}
                index="name"
                category="value"
                valueFormatter={(n) => n.toString()}
                className="h-56"
              />
            </Card.Content>
          </Card>
        )}
        {(s.perDay ?? []).length > 0 && (
          <Card className="border border-border/50 shadow-sm">
            <Card.Header>
              <Card.Title className="text-sm font-semibold">Shipments per Day (14 days)</Card.Title>
            </Card.Header>
            <Card.Content>
              <BarChart
                data={(s.perDay ?? []).map((d) => ({ date: d.date, shipments: d.count }))}
                index="date"
                categories={['shipments']}
                colors={['emerald']}
                valueFormatter={(n) => n.toString()}
                className="h-56"
              />
            </Card.Content>
          </Card>
        )}
      </div>

      {renderAlerts(stats.alerts)}

      <Card className="border border-border/50 shadow-sm bg-gradient-to-br from-accent/[0.03] to-transparent">
        <Card.Header>
          <Card.Title className="text-sm font-semibold">Quick Actions</Card.Title>
          <Card.Description className="text-xs text-muted">Common tasks to keep things moving</Card.Description>
        </Card.Header>
        <Card.Content>
          <div className="flex flex-wrap gap-3">
            <Button onPress={() => router.push('/shipments?status=pending')} className="bg-accent text-white hover:bg-accent/90 shadow-sm shadow-accent/20">
              <Plus size={14} />
              New Shipment
            </Button>
            <Button variant="ghost" onPress={() => router.push('/customers')} className="hover:bg-accent/10">
              <Users size={14} />
              New Customer
            </Button>
            <Button variant="ghost" onPress={() => router.push('/quotations')} className="hover:bg-accent/10">
              <FileText size={14} />
              New Quotation
            </Button>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}

function renderAlerts(alerts: Alert[]) {
  if (alerts.length === 0) return null;

  const iconMap: Record<string, React.ReactNode> = {
    stale: <Clock size={14} />,
    overdue: <CalendarClock size={14} />,
    exception: <AlertTriangle size={14} />,
  };
  const colorMap: Record<string, string> = {
    stale: 'text-amber-700 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
    overdue: 'text-orange-700 bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20',
    exception: 'text-red-700 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',
  };

  return (
    <Card className="border border-border/50 shadow-sm">
      <Card.Header>
        <Card.Title className="text-sm font-semibold">Alerts — Shipments Needing Attention</Card.Title>
        <Card.Description className="text-xs text-muted">{alerts.length} shipment{alerts.length !== 1 ? 's' : ''} flagged</Card.Description>
      </Card.Header>
      <Card.Content>
        <div className="space-y-2">
          {alerts.slice(0, 8).map((a) => {
            const desc = a.type === 'stale'
              ? `No update in ${a.lastTrackedAt ? Math.floor((Date.now() - new Date(a.lastTrackedAt).getTime()) / 86400000) : '?'} days`
              : a.type === 'overdue'
                ? `ETA was ${a.estimatedDelivery ? new Date(a.estimatedDelivery).toLocaleDateString() : '?'}`
                : `Status: ${statusLabel(a.status)}`;
            return (
              <a
                key={a.shipmentId}
                href={`/shipments/${a.shipmentId}`}
                className={`flex items-center gap-2.5 text-sm px-3.5 py-2.5 rounded-xl border ${colorMap[a.type] ?? 'text-muted bg-surface border-border/50'} hover:shadow-sm transition-all`}
              >
                <span className="shrink-0">{iconMap[a.type] ?? <AlertTriangle size={14} />}</span>
                <span className="font-mono font-medium text-xs">{a.trackingNo}</span>
                <span className="text-current/70 text-xs">— {desc}</span>
              </a>
            );
          })}
        </div>
      </Card.Content>
    </Card>
  );
}
