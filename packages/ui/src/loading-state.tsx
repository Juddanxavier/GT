'use client';

import { useId } from 'react';

interface LoadingStateProps {
  rows?: number;
  columns?: number;
  className?: string;
  label?: string;
}

/** Skeleton shaped like a table, announced to assistive tech as busy. */
export function LoadingState({
  rows = 8,
  columns = 5,
  className,
  label = 'Loading',
}: LoadingStateProps) {
  const baseId = useId();
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={['space-y-2 p-4', className ?? ''].filter(Boolean).join(' ')}
    >
      {Array.from({ length: rows }, (_, r) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are static placeholders that never reorder
        <div key={`${baseId}-row-${r}`} className="flex gap-2">
          {Array.from({ length: columns }, (_, c) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton cells are static placeholders that never reorder
              key={`${baseId}-row-${r}-col-${c}`}
              className="h-8 flex-1 animate-pulse rounded-md"
              style={{ backgroundColor: 'var(--surface-active)' }}
            />
          ))}
        </div>
      ))}
      <span className="sr-only">{label}…</span>
    </div>
  );
}
