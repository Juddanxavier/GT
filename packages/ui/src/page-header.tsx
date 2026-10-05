'use client';

import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** One header per page: title, optional description and breadcrumb, actions slot. */
export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={['flex flex-wrap items-center justify-between gap-4', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="min-w-0">
        {breadcrumb ? <div className="mb-1">{breadcrumb}</div> : null}
        <h1 className="text-lg font-bold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
