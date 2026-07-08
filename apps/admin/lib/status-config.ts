const INTERNAL_STATUSES = [
  'pending', 'info_received', 'in_transit', 'out_for_delivery',
  'failed_attempt', 'delivered', 'exception', 'expired',
  'available_for_pickup',
] as const;

type InternalStatus = (typeof INTERNAL_STATUSES)[number];

const STATUS_LABELS: Record<InternalStatus, string> = {
  pending: 'Pending',
  info_received: 'Info Received',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  failed_attempt: 'Failed Attempt',
  delivered: 'Delivered',
  exception: 'Exception',
  expired: 'Expired',
  available_for_pickup: 'Available for Pickup',
};

type ChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'accent';

export const STATUS_COLORS: Record<InternalStatus, ChipColor> = {
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

export const STATUS_GROUPS: Record<string, InternalStatus[]> = {
  Pending: ['pending', 'info_received'],
  'In Transit': ['in_transit', 'out_for_delivery', 'failed_attempt'],
  Delivered: ['delivered'],
  Exception: ['exception', 'expired'],
  'Available for Pickup': ['available_for_pickup'],
};

export const FILTER_GROUPS = Object.keys(STATUS_GROUPS) as (keyof typeof STATUS_GROUPS)[];

export function statusGroup(status: InternalStatus): string {
  for (const [group, statuses] of Object.entries(STATUS_GROUPS)) {
    if ((statuses as InternalStatus[]).includes(status)) return group;
  }
  return 'Pending';
}

export const STATUS_META: Record<InternalStatus, { label: string; color: ChipColor }> = Object.fromEntries(
  INTERNAL_STATUSES.map((s) => [
    s,
    { label: STATUS_LABELS[s], color: STATUS_COLORS[s] },
  ]),
) as Record<InternalStatus, { label: string; color: ChipColor }>;
