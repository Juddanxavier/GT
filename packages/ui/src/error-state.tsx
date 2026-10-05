'use client';

import type { ReactNode } from 'react';

interface ErrorStateProps {
  message: string;
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
  action?: ReactNode;
  className?: string;
}

/** Error panel with the message tied to an alert role, plus optional retry. */
export function ErrorState({
  message,
  title = 'Something went wrong',
  onRetry,
  retryLabel = 'Retry',
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={[
        'flex flex-col items-center justify-center gap-2 py-16 text-center',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-xs text-muted">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted/10"
          style={{ borderColor: 'var(--border)' }}
        >
          {retryLabel}
        </button>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
