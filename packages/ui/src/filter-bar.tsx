'use client';

import type { ReactNode } from 'react';

interface FilterBarProps {
  children: ReactNode;
  onClear?: () => void;
  clearLabel?: string;
  className?: string;
}

/** Generic filter shell: lays out filter controls passed as children with an
 * optional clear action. Not tied to any domain. */
export function FilterBar({ children, onClear, clearLabel = 'Clear', className }: FilterBarProps) {
  return (
    <div
      className={['flex flex-col gap-3 sm:flex-row sm:items-center', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-8 shrink-0 items-center rounded-md px-3 text-xs font-medium text-muted transition-colors hover:text-foreground"
        >
          {clearLabel}
        </button>
      ) : null}
    </div>
  );
}
