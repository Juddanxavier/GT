import { INTERNAL_STATUSES, STATUS_LABELS, type InternalStatus } from '@repo/types/status';

export type { InternalStatus } from '@repo/types/status';

/** Semantic chip color per shipment status */
export type StatusColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'transit'
  | 'accent';

/** Canonical color mapping for each shipment status */
export const STATUS_COLORS: Record<InternalStatus, StatusColor> = {
  pending: 'warning',
  info_received: 'warning',
  in_transit: 'transit',
  out_for_delivery: 'transit',
  failed_attempt: 'danger',
  delivered: 'success',
  exception: 'danger',
  expired: 'default',
  available_for_pickup: 'secondary',
};

/** Design token triple backing each semantic color. Values are CSS var()
 * references so they follow the active theme. The default dot uses the muted
 * tone for visibility, since the default surface tone is nearly invisible. */
export interface StatusTokenTriple {
  dot: string;
  background: string;
  foreground: string;
}

export const STATUS_TOKEN_TRIPLES: Record<StatusColor, StatusTokenTriple> = {
  default: {
    dot: 'var(--muted)',
    background: 'var(--default-soft)',
    foreground: 'var(--default-soft-foreground)',
  },
  primary: {
    dot: 'var(--primary)',
    background: 'var(--primary-soft)',
    foreground: 'var(--primary-soft-foreground)',
  },
  secondary: {
    dot: 'var(--secondary)',
    background: 'var(--secondary-soft)',
    foreground: 'var(--secondary-soft-foreground)',
  },
  success: {
    dot: 'var(--success)',
    background: 'var(--success-soft)',
    foreground: 'var(--success-soft-foreground)',
  },
  warning: {
    dot: 'var(--warning)',
    background: 'var(--warning-soft)',
    foreground: 'var(--warning-soft-foreground)',
  },
  danger: {
    dot: 'var(--danger)',
    background: 'var(--danger-soft)',
    foreground: 'var(--danger-soft-foreground)',
  },
  accent: {
    dot: 'var(--accent)',
    background: 'var(--accent-soft)',
    foreground: 'var(--accent-soft-foreground)',
  },
  transit: {
    dot: 'var(--transit)',
    background: 'var(--transit-soft)',
    foreground: 'var(--transit-soft-foreground)',
  },
};

/** Full display style per status: label, semantic color, and token triple */
export interface StatusStyle extends StatusTokenTriple {
  label: string;
  color: StatusColor;
}

export const STATUS_STYLE: Record<InternalStatus, StatusStyle> = Object.fromEntries(
  INTERNAL_STATUSES.map((s) => [
    s,
    { label: STATUS_LABELS[s], color: STATUS_COLORS[s], ...STATUS_TOKEN_TRIPLES[STATUS_COLORS[s]] },
  ]),
) as Record<InternalStatus, StatusStyle>;

/** Grouping: which filter group each status belongs to */
export const STATUS_GROUPS: Record<string, InternalStatus[]> = {
  Pending: ['pending', 'info_received'],
  'In Transit': ['in_transit', 'out_for_delivery', 'failed_attempt'],
  Delivered: ['delivered'],
  Exception: ['exception', 'expired'],
  'Available for Pickup': ['available_for_pickup'],
};

/** All group labels in display order */
export const FILTER_GROUPS = Object.keys(STATUS_GROUPS);

/** Group name for a given status */
export function statusGroup(status: InternalStatus): string {
  for (const [group, statuses] of Object.entries(STATUS_GROUPS)) {
    if ((statuses as InternalStatus[]).includes(status)) return group;
  }
  return 'Pending';
}

/** KPI card counts per status group (source of truth for dashboard cards) */
export function statusGroupCounts(
  counts: Record<string, number> | undefined,
): Record<string, number> {
  const groupCounts: Record<string, number> = {};
  for (const [group, statuses] of Object.entries(STATUS_GROUPS)) {
    groupCounts[group] = statuses.reduce((sum, s) => sum + (counts?.[s] ?? 0), 0);
  }
  groupCounts.total = Object.values(counts ?? {}).reduce((a, b) => a + (b ?? 0), 0);
  return groupCounts;
}

/** Full meta for status display */
export const STATUS_META = Object.fromEntries(
  INTERNAL_STATUSES.map((s) => [s, { label: STATUS_LABELS[s], color: STATUS_COLORS[s] }]),
) as Record<InternalStatus, { label: string; color: StatusColor }>;
