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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {backHref && (
          <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-6">
            <ArrowLeft size={14} />
            {backLabel}
          </Link>
        )}

        <Card>
          <Card.Content className="p-8 space-y-6">
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-accent/10 mx-auto mb-4">
                <span className="text-accent text-lg font-bold tracking-tight">GT</span>
              </div>
              {title && <h1 className="text-xl font-semibold text-foreground tracking-tight">{title}</h1>}
              {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
            </div>

            {children}
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
