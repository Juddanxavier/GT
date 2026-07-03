'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@heroui/react';

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
      {/* Gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(var(--accent)/0.06),transparent_60%),radial-gradient(ellipse_at_bottom,_oklch(var(--accent)/0.03),transparent_60%)]" />

      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, oklch(var(--foreground)/0.3) 1px, transparent 0)`, backgroundSize: '24px 24px' }} />

      {/* Glowing orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-accent/20 blur-[120px] animate-[pulse-glow_6s_ease-in-out_infinite]" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-accent/15 blur-[100px] animate-[pulse-glow_8s_ease-in-out_infinite_2s]" />
      <div className="absolute top-2/3 left-1/3 w-64 h-64 rounded-full bg-accent/10 blur-[80px] animate-[pulse-glow_7s_ease-in-out_infinite_1s]" />

      {/* Decorative shapes */}
      <svg className="absolute top-1/3 right-1/4 w-64 h-64 text-accent/10 rotate-45 animate-[float-slow_var(--anim-slow)_ease-in-out_infinite]" viewBox="0 0 200 200" fill="none">
        <path d="M100 0L141.42 58.58L200 100L141.42 141.42L100 200L58.58 141.42L0 100L58.58 58.58Z" stroke="currentColor" strokeWidth="0.5" />
        <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="0.5" />
      </svg>
      <svg className="absolute bottom-1/3 left-1/4 w-48 h-48 text-accent/8 -rotate-12 animate-[float-medium_var(--anim-medium)_ease-in-out_infinite]" viewBox="0 0 200 200" fill="none">
        <rect x="10" y="10" width="180" height="180" rx="40" stroke="currentColor" strokeWidth="0.5" />
        <rect x="40" y="40" width="120" height="120" rx="20" stroke="currentColor" strokeWidth="0.5" />
      </svg>

      <div className="relative w-full max-w-md animate-[fade-up_0.5s_ease-out]">
        {/* Back link */}
        {backHref && (
          <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-6">
            <ArrowLeft size={14} />
            {backLabel}
          </Link>
        )}

        {/* Brand badge - above card */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent/70 shadow-xl shadow-accent/20 mb-4 ring-[3px] ring-white/10">
            <span className="text-accent-foreground text-xl font-bold tracking-tight">GT</span>
          </div>
        </div>

        {/* Card */}
        <Card className="border border-border/60 bg-surface shadow-2xl shadow-black/20 rounded-2xl">
          <Card.Content className="p-8 space-y-6">
            {title && <h1 className="text-xl font-semibold text-foreground tracking-tight text-center">{title}</h1>}
            {subtitle && <p className="text-sm text-muted text-center -mt-4">{subtitle}</p>}

            {children}
          </Card.Content>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted/50 mt-8 animate-[fade-up_0.5s_ease-out_0.2s_both]">
          &copy; {new Date().getFullYear()} Gajan Traders
        </p>
      </div>
    </div>
  );
}
