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
};

export const FILTER_GROUPS = Object.keys(STATUS_GROUPS) as (keyof typeof STATUS_GROUPS)[];

export function statusGroup(status: InternalStatus): string {
  for (const [group, statuses] of Object.entries(STATUS_GROUPS)) {
    if ((statuses as InternalStatus[]).includes(status)) return group;
  }
  return 'Pending';
}

// KPI card counts per status group (source of truth for the dashboard cards).
export function statusGroupCounts(counts: Record<string, number> | undefined): Record<string, number> {
  const groupCounts: Record<string, number> = {};
  for (const [group, statuses] of Object.entries(STATUS_GROUPS)) {
    groupCounts[group] = statuses.reduce((sum, s) => sum + (counts?.[s] ?? 0), 0);
  }
  groupCounts.total = Object.values(counts ?? {}).reduce((a, b) => a + (b ?? 0), 0);
  return groupCounts;
}

export const STATUS_META: Record<InternalStatus, { label: string; color: ChipColor }> = Object.fromEntries(
  INTERNAL_STATUSES.map((s) => [
    s,
    { label: STATUS_LABELS[s], color: STATUS_COLORS[s] },
  ]),
) as Record<InternalStatus, { label: string; color: ChipColor }>;

export const INVOICE_STATUS_COLORS: Record<string, 'success' | 'default' | 'warning' | 'danger' | 'accent'> = {
  paid: 'success',
  unpaid: 'warning',
  cancelled: 'danger',
  refunded: 'danger',
};
