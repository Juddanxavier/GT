import type { ReactNode } from 'react';
import { StatusBadge } from '@repo/ui/status-badge';

interface ShipmentStatusBadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/** Admin shipment badge. Delegates to the shared StatusBadge; the optional
 * label override and size are the only admin additions. */
export function ShipmentStatusBadge({ status, label, size = 'sm', className }: ShipmentStatusBadgeProps): ReactNode {
  const sizing = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1.5' : 'px-2.5 py-1 text-sm gap-2';
  return (
    <StatusBadge
      status={status}
      label={label}
      className={[sizing, 'whitespace-nowrap', className ?? ''].filter(Boolean).join(' ')}
    />
  );
}
