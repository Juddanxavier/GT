'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  description?: string;
}

export function AuthLayout({ children, backHref, backLabel = 'Back', description }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-[45%] relative flex-col items-center justify-center bg-surface overflow-hidden p-12">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-accent/8 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />
        <div className="relative z-10 text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent/10 border border-accent/20 mb-6">
            <span className="text-accent text-3xl font-bold tracking-tight">GT</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Gajan Traders</h1>
          <p className="text-sm text-muted mt-2">Shipment Tracking Platform</p>
          {description && (
            <>
              <div className="my-8 mx-auto w-12 h-px bg-accent/30" />
              <p className="text-sm text-muted leading-relaxed">{description}</p>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          {backHref && (
            <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-8">
              <ArrowLeft size={14} />
              {backLabel}
            </Link>
          )}

          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-accent/10 border border-accent/20 mb-4">
              <span className="text-accent text-xl font-bold tracking-tight">GT</span>
            </div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Gajan Traders</h1>
            <p className="text-sm text-muted mt-1">Shipment Tracking Platform</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
