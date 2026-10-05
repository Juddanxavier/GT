'use client';

import { STATUS_LABELS, type InternalStatus } from '@repo/types/status';
import { STATUS_STYLE } from './status-config';

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

/** Shipment status pill. Label text plus a status dot, colored from the shared
 * token pairs. Color is never the only signal: the label always renders. */
export function StatusBadge({ status, label: labelOverride, className }: StatusBadgeProps) {
  const key = status as InternalStatus;
  const label = labelOverride ?? STATUS_LABELS[key] ?? status.replace(/_/g, ' ');
  const style = STATUS_STYLE[key];

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        style
          ? {
              color: style.foreground,
              backgroundColor: style.background,
              borderColor: style.dot,
            }
          : undefined
      }
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={style ? { backgroundColor: style.dot } : undefined}
      />
      {label}
    </span>
  );
}
