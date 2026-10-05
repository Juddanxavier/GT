'use client';

import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Informative empty panel with one optional call to action, never blank space. */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center gap-2 py-16 text-center',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="max-w-sm text-xs text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
