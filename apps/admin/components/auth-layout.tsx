'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  title?: string;
  subtitle?: string;
}

export function AuthLayout({ children, backHref, backLabel = 'Back', title, subtitle }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(var(--accent)/0.06),transparent_60%),radial-gradient(ellipse_at_bottom,_oklch(var(--accent)/0.03),transparent_60%)]" />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, oklch(var(--foreground)/0.3) 1px, transparent 0)`, backgroundSize: '32px 32px' }} />

      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-accent/8 blur-[120px]" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-accent/5 blur-[100px]" />
      <svg className="absolute top-1/3 right-1/4 w-64 h-64 text-accent/[0.02] rotate-45" viewBox="0 0 200 200" fill="none">
        <path d="M100 0L141.42 58.58L200 100L141.42 141.42L100 200L58.58 141.42L0 100L58.58 58.58Z" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="0.5" />
      </svg>
      <svg className="absolute bottom-1/3 left-1/4 w-48 h-48 text-accent/[0.015] -rotate-12" viewBox="0 0 200 200" fill="none">
        <rect x="10" y="10" width="180" height="180" rx="40" stroke="currentColor" strokeWidth="0.5" />
        <rect x="40" y="40" width="120" height="120" rx="20" stroke="currentColor" strokeWidth="0.5" />
      </svg>

      <div className="relative w-full max-w-md">
        {backHref && (
          <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-6">
            <ArrowLeft size={14} />
            {backLabel}
          </Link>
        )}

        <div className="rounded-2xl border border-border/60 bg-surface/80 backdrop-blur-xl shadow-2xl shadow-black/20">
          <div className="p-10 space-y-8">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 ring-1 ring-accent/20 mx-auto mb-5">
                <span className="text-accent text-lg font-bold tracking-tight">GT</span>
              </div>
              {title && <h1 className="text-2xl font-semibold text-foreground tracking-tight">{title}</h1>}
              {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
