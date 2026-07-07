import { INTERNAL_STATUSES, type InternalStatus, STATUS_LABELS } from '@repo/types/status';

/** Canonical color mapping for each shipment status */
export const STATUS_COLORS: Record<InternalStatus, string> = {
  pending: 'warning',
  info_received: 'warning',
  in_transit: 'primary',
  out_for_delivery: 'primary',
  failed_attempt: 'danger',
  delivered: 'success',
  exception: 'danger',
  expired: 'default',
  available_for_pickup: 'secondary',
};

/** Grouping: which filter group each status belongs to (5 tabs per D-03) */
export const STATUS_GROUPS: Record<string, InternalStatus[]> = {
  Pending: ['pending', 'info_received'],
  'In Transit': ['in_transit', 'out_for_delivery', 'failed_attempt'],
  Delivered: ['delivered'],
  Exception: ['exception', 'expired'],
  'Available for Pickup': ['available_for_pickup'],
};

/** All group labels in display order */
export const FILTER_GROUPS = Object.keys(STATUS_GROUPS) as (keyof typeof STATUS_GROUPS)[];

/** Group name for a given status */
export function statusGroup(status: InternalStatus): string {
  for (const [group, statuses] of Object.entries(STATUS_GROUPS)) {
    if ((statuses as InternalStatus[]).includes(status)) return group;
  }
  return 'Pending';
}

/** Full meta for status display */
export const STATUS_META = Object.fromEntries(
  INTERNAL_STATUSES.map((s) => [
    s,
    { label: STATUS_LABELS[s], color: STATUS_COLORS[s] },
  ]),
) as Record<InternalStatus, { label: string; color: string }>;
