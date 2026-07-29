'use client';

import type { ReactNode } from 'react';
import { Package, TrendingUp, CheckCircle, AlertTriangle, Search, FileText, Calendar, ArrowRight, RefreshCw, PackageSearch, ChevronRight, Box } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { authClient } from '@/lib/auth-client';
import { useCustomerDashboard } from '@/lib/queries';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', info_received: 'Info Received', in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery', delivered: 'Delivered',
  delivery_failure: 'Delivery Failed', cancelled: 'Cancelled', exception: 'Exception',
};

function DashboardSkeleton(): ReactNode {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-foreground/[0.03] rounded-2xl p-8 space-y-4">
        <div className="h-8 w-72 bg-foreground/5 rounded-xl" />
        <div className="h-4 w-48 bg-foreground/5 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl bg-foreground/[0.02] p-6"><div className="h-20" /></div>
        ))}
      </div>
      <div className="rounded-2xl bg-foreground/[0.02] p-6"><div className="h-48" /></div>
    </div>
  );
}

function DashboardSection(): ReactNode {
  const { data: dash, isLoading, error, refetch } = useCustomerDashboard(true);

  if (isLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 p-10 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100"><PackageSearch size={24} className="text-red-400" /></div>
        <div><h2 className="text-lg font-bold text-foreground mb-1">Failed to load dashboard</h2><p className="text-base text-foreground/70">Please try again.</p></div>
        <button type="button" onClick={() => refetch()} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-foreground text-sm font-semibold shadow-sm hover:shadow-md transition-all cursor-pointer">
          <RefreshCw size={14} /> Try Again
        </button>
      </div>
    );
  }

  if (!dash) return null;

  const kpiCards = [
    { icon: Package, label: 'Total Shipments', value: dash.kpis.total, color: '#F94735' },
    { icon: TrendingUp, label: 'In Transit', value: dash.kpis.inTransit, color: '#3B82F6' },
    { icon: CheckCircle, label: 'Delivered', value: dash.kpis.delivered, color: '#10B981' },
    { icon: AlertTriangle, label: 'Exceptions', value: dash.kpis.exception, color: '#F59E0B' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiCards.map((k) => (
          <div key={k.label} className="rounded-2xl bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] p-6 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${k.color}15`, color: k.color }}>
                <k.icon size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">{k.label}</p>
                <p className="text-2xl font-bold text-foreground mt-0.5 tabular-nums">{k.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { icon: Search, label: 'Track Shipment', href: '/track', desc: 'Real-time tracking', color: '#F94735' },
          { icon: FileText, label: 'New Shipment', href: '/my-shipments', desc: 'Create a booking', color: '#3B82F6' },
          { icon: Calendar, label: 'Schedule Pickup', href: '/pickup', desc: 'Door-to-door pickup', color: '#10B981' },
        ].map((a) => (
          <a
            key={a.label}
            href={a.href}
            className="group flex items-center gap-4 rounded-2xl bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_0_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300" style={{ backgroundColor: `${a.color}12`, color: a.color }}>
              <a.icon size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-foreground">{a.label}</p>
              <p className="text-foreground/50">{a.desc}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center group-hover:bg-[#F94735]/10 group-hover:text-[#F94735] transition-all">
              <ChevronRight size={16} />
            </div>
          </a>
        ))}
      </div>

      {dash.recent.length > 0 && (
        <div className="rounded-2xl bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="px-6 py-4 border-b border-foreground/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Box size={16} className="text-foreground/40" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Recent Shipments</h2>
            </div>
            <span className="text-xs text-foreground/40 bg-foreground/5 px-2.5 py-1 rounded-full tabular-nums">{dash.recent.length}</span>
          </div>
          <div className="divide-y divide-foreground/5">
            {dash.recent.map((s) => (
              <a key={s.id} href={`/my-shipments/${s.trackingNo}`} className="flex items-center justify-between px-6 py-4 hover:bg-foreground/[0.02] transition-colors group">
                <div className="min-w-0 flex items-center gap-4">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    s.status === 'delivered' ? 'bg-emerald-500 shadow-[0_0_6px_0_rgba(16,185,129,0.4)]' :
                    s.status === 'in_transit' || s.status === 'out_for_delivery' ? 'bg-blue-500 shadow-[0_0_6px_0_rgba(59,130,246,0.4)]' :
                    s.status === 'exception' || s.status === 'delivery_failure' ? 'bg-red-500 shadow-[0_0_6px_0_rgba(239,68,68,0.4)]' :
                    s.status === 'pending' || s.status === 'info_received' ? 'bg-amber-500 shadow-[0_0_6px_0_rgba(245,158,11,0.4)]' :
                    'bg-foreground/30'
                  }`} />
                  <div>
                    <p className="text-base font-mono font-bold text-foreground">{s.trackingNo}</p>
                    <p className="text-sm text-foreground/50 mt-0.5">{new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${
                    s.status === 'delivered' ? 'text-emerald-600' :
                    s.status === 'in_transit' || s.status === 'out_for_delivery' ? 'text-blue-600' :
                    s.status === 'exception' || s.status === 'delivery_failure' ? 'text-red-600' :
                    s.status === 'pending' || s.status === 'info_received' ? 'text-amber-600' :
                    'text-foreground/50'
                  }`}>{STATUS_LABELS[s.status] || s.status}</span>
                  <ChevronRight size={14} className="text-foreground/20 group-hover:text-[#F94735] group-hover:translate-x-0.5 transition-all" />
                </div>
              </a>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-foreground/5">
            <a href="/my-shipments" className="inline-flex items-center gap-1.5 font-semibold text-[#F94735] hover:text-[#e03e2d] transition-colors">
              View all shipments <ArrowRight size={14} />
            </a>
          </div>
        </div>
      )}

      {dash.alerts.length > 0 && (
        <div className="rounded-2xl bg-amber-50 p-5 space-y-3 border border-amber-200/50">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600" />
            <span className="text-sm font-bold text-amber-800 uppercase tracking-wider">Alerts</span>
          </div>
          {dash.alerts.map((a, i) => (
            <p key={i} className="text-amber-700"><strong className="font-mono">{a.trackingNo}</strong> — {a.message}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardContent(): ReactNode {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <DashboardSkeleton />;
  if (!session) return null;

  const userName = (session.user as Record<string, unknown>).name as string;
  const initials = userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const email = (session.user as Record<string, unknown>).email as string;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#F94735] text-white flex items-center justify-center text-xl font-bold shrink-0 shadow-sm">
          {initials}
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Welcome back, {userName.split(' ')[0]}</h1>
          <p className="text-foreground/50 mt-0.5">{email}</p>
        </div>
      </div>

      <div className="space-y-6">
        <DashboardSection />
      </div>
    </div>
  );
}

export default function DashboardPage(): ReactNode {
  return <ErrorBoundary><DashboardContent /></ErrorBoundary>;
}
