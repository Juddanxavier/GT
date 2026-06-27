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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_oklch(var(--accent)/0.08),transparent_50%),radial-gradient(ellipse_at_bottom_left,_oklch(var(--accent)/0.05),transparent_50%)]" />
      <Card className="w-full max-w-sm relative">
        <Card.Content className="p-8 space-y-6">
          {backHref && (
            <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors">
              <ArrowLeft size={14} />
              {backLabel}
            </Link>
          )}

          <div className="text-center space-y-1">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 mb-4">
              <span className="text-accent text-xl font-bold tracking-tight">GT</span>
            </div>
            {title && <h1 className="text-xl font-semibold text-foreground tracking-tight">{title}</h1>}
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>

          {children}
        </Card.Content>
      </Card>
    </div>
  );
}
