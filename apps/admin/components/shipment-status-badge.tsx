import type { ReactNode } from 'react';

export type ShipmentStatusGroup = 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception' | 'cancelled';

const INTERNAL_TO_GROUP: Record<string, ShipmentStatusGroup> = {
  pending: 'pending',
  info_received: 'pending',
  in_transit: 'in_transit',
  out_for_delivery: 'out_for_delivery',
  failed_attempt: 'in_transit',
  delivered: 'delivered',
  exception: 'exception',
  expired: 'exception',
  available_for_pickup: 'out_for_delivery',
};

const STATUS_META: Record<ShipmentStatusGroup, { label: string; dot: string; text: string; bg: string; border: string }> = {
  pending: {
    label: 'Pending',
    dot: '#F59E0B',
    text: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-[#422006]',
    border: 'border-amber-200/60 dark:border-amber-400/20',
  },
  in_transit: {
    label: 'In Transit',
    dot: '#3B82F6',
    text: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-[#172554]',
    border: 'border-blue-200/60 dark:border-blue-400/20',
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    dot: '#8B5CF6',
    text: 'text-violet-700 dark:text-violet-300',
    bg: 'bg-violet-50 dark:bg-[#2E1065]',
    border: 'border-violet-200/60 dark:border-violet-400/20',
  },
  delivered: {
    label: 'Delivered',
    dot: '#10B981',
    text: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-[#052E1B]',
    border: 'border-emerald-200/60 dark:border-emerald-400/20',
  },
  exception: {
    label: 'Exception',
    dot: '#EF4444',
    text: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-50 dark:bg-[#450A0A]',
    border: 'border-red-200/60 dark:border-red-400/20',
  },
  cancelled: {
    label: 'Cancelled',
    dot: '#64748B',
    text: 'text-slate-600 dark:text-zinc-300',
    bg: 'bg-slate-100 dark:bg-[#27272A]',
    border: 'border-slate-200/60 dark:border-zinc-500/20',
  },
};

export function statusGroup(status: string): ShipmentStatusGroup {
  return INTERNAL_TO_GROUP[status] ?? 'pending';
}

interface ShipmentStatusBadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
}

export function ShipmentStatusBadge({ status, label, size = 'sm' }: ShipmentStatusBadgeProps): ReactNode {
  const group = statusGroup(status);
  const meta = STATUS_META[group];
  const pill = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1.5' : 'px-2.5 py-1 text-sm gap-2';
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border font-medium ${pill} ${meta.bg} ${meta.border} ${meta.text}`}
      role="status"
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.dot }} />
      {label ?? meta.label}
    </span>
  );
}
