'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, MapPin, BellRing, ShieldCheck } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  title?: string;
  subtitle?: string;
}

const brandPanel = [
  { icon: Package, title: 'Track every shipment', desc: 'Real-time status updates from carrier to customer.' },
  { icon: BellRing, title: 'Automatic notifications', desc: 'Email and WhatsApp alerts on every status change.' },
  { icon: ShieldCheck, title: 'Multi-tenant by design', desc: 'Data isolated across branches and organizations.' },
] as const;

export function AuthLayout({ children, backHref, backLabel = 'Back', title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2 app-mesh-bg">
      <aside className="hidden lg:flex flex-col bg-rail text-sidebar-foreground relative overflow-hidden border-r border-glass">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-info/5 pointer-events-none" />
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(167,139,250,0.15) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative flex flex-col h-full p-10 xl:p-14">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent text-accent-foreground shadow-glow-accent">
              <span className="text-base font-bold tracking-tight">GT</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-sidebar-foreground leading-none">Gajan Traders</p>
              <p className="text-xs text-sidebar-muted mt-1">Shipment Tracking Suite</p>
            </div>
          </div>

          <div className="mt-auto mb-auto pt-10">
            <h2 className="text-4xl font-bold tracking-tight leading-[1.15] text-sidebar-foreground max-w-md">
              Shipments, quotes, and invoicing — under one roof.
            </h2>
            <p className="text-sidebar-muted mt-4 max-w-sm text-sm leading-relaxed">
              Manage every parcel across branches and organizations without leaking data between tenants.
            </p>

            <ul className="mt-10 space-y-5">
              {brandPanel.map((f) => (
                <li key={f.title} className="flex items-start gap-3.5">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-active-bg text-sidebar-active-fg shrink-0 border border-glass">
                    <f.icon size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-sidebar-foreground">{f.title}</p>
                    <p className="text-xs text-sidebar-muted mt-0.5">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-sidebar-muted/70 flex items-center gap-1.5">
            <MapPin size={12} />
            Serving India &amp; Sri Lanka
          </p>
        </div>
      </aside>

      <div className="flex flex-col min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          {backHref && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-accent transition-colors mb-8"
            >
              <ArrowLeft size={14} />
              {backLabel}
            </Link>
          )}

          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent text-accent-foreground shadow-glow-accent">
              <span className="text-base font-bold tracking-tight">GT</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground leading-none">Gajan Traders</p>
              <p className="text-xs text-muted mt-1">Shipment Tracking Suite</p>
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-glass p-6 sm:p-8">
            <div className="mb-6">
              {title && <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>}
              {subtitle && <p className="text-sm text-muted mt-1.5">{subtitle}</p>}
            </div>

            {children}
          </div>

          <p className="text-center text-xs text-muted/50 mt-8">
            &copy; {new Date().getFullYear()} Gajan Traders
          </p>
        </div>
      </div>
    </div>
  );
}
