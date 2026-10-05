// Single source of truth lives in @repo/ui. This module re-exports the shared
// shipment status vocabulary so existing admin imports keep working.
export {
  FILTER_GROUPS,
  STATUS_COLORS,
  STATUS_GROUPS,
  STATUS_META,
  STATUS_STYLE,
  STATUS_TOKEN_TRIPLES,
  statusGroup,
  statusGroupCounts,
  type InternalStatus,
  type StatusColor,
  type StatusStyle,
  type StatusTokenTriple,
} from '@repo/ui/status-config';

/** Invoice states are not shipment statuses, so they stay local to the admin. */
export const INVOICE_STATUS_COLORS: Record<string, 'success' | 'default' | 'warning' | 'danger' | 'accent'> = {
  paid: 'success',
  unpaid: 'warning',
  cancelled: 'danger',
  refunded: 'danger',
};
