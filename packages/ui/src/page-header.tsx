'use client';

import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/**
 * One header per page: the single owner of the page `h1`, so every route has
 * exactly one top level heading no matter which app renders it.
 */
export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  icon,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={['flex flex-wrap items-center justify-between gap-6', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex min-w-0 items-center gap-3">
        {icon ? (
          <span className="inline-flex shrink-0 items-center justify-center w-10 h-10 rounded-xl border border-glass glass-panel text-muted">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 space-y-1">
          {breadcrumb ? <div className="mb-1">{breadcrumb}</div> : null}
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {description ? <p className="text-sm text-muted">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
