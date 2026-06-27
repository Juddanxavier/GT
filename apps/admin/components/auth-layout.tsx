'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, BarChart3, Truck, Shield } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  title?: string;
  subtitle?: string;
}

const features = [
  { icon: Package, label: 'Multi-tenant logistics' },
  { icon: Truck, label: 'Real-time tracking' },
  { icon: BarChart3, label: 'Analytics & reports' },
  { icon: Shield, label: 'Role-based access' },
];

export function AuthLayout({ children, backHref, backLabel = 'Back', title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex bg-white">
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between bg-gradient-to-br from-accent/5 via-accent/[0.02] to-accent/10 p-12 overflow-hidden">
        <div className="absolute top-20 -right-20 w-96 h-96 rounded-full bg-accent/8 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)`, backgroundSize: '48px 48px' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent text-white text-sm font-bold tracking-tight">GT</div>
            <span className="text-sm font-semibold text-gray-900">Gajan Traders</span>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 leading-tight">Shipment tracking<br />made simple.</h2>
            <p className="text-sm text-gray-500 leading-relaxed max-w-sm">
              Manage shipments across India and Sri Lanka. Track in real-time, generate invoices, and keep your customers informed.
            </p>
          </div>

          <div className="space-y-4">
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-3 text-sm text-gray-600">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10"><f.icon size={15} className="text-accent" /></div>
                {f.label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-gray-400">
          &copy; 2026 Gajan Traders. All rights reserved.
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex flex-col items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent text-white text-sm font-bold tracking-tight">GT</div>
            <div className="text-center">
              <h1 className="text-lg font-semibold text-gray-900 tracking-tight">Gajan Traders</h1>
              <p className="text-xs text-gray-500">Shipment Tracking Platform</p>
            </div>
          </div>

          {backHref && (
            <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft size={14} />
              {backLabel}
            </Link>
          )}

          <div className="space-y-1">
            {title && <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">{title}</h1>}
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
