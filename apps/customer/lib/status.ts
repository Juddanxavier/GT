import { STATUS_LABELS as CORE_STATUS_LABELS } from '@repo/types/status';

export type StatusColor = 'warning' | 'accent' | 'success' | 'danger' | 'default';

/** Labels for every status this app can render (core set + customer-app extras). */
export const STATUS_LABELS: Record<string, string> = {
  ...CORE_STATUS_LABELS,
  delivery_failure: 'Delivery Failed',
  cancelled: 'Cancelled',
};

/** HeroUI Chip color per status. */
export const STATUS_COLORS: Record<string, StatusColor> = {
  pending: 'warning',
  info_received: 'accent',
  in_transit: 'warning',
  out_for_delivery: 'warning',
  delivered: 'success',
  delivery_failure: 'danger',
  cancelled: 'default',
  exception: 'danger',
};
