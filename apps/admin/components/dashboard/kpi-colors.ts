/**
 * Chart palette — the lime-and-warm ancillary ramp used by every dashboard,
 * reports, and KPI series. Written as literal hex because Tailwind 4 resolves
 * `lime-500` and friends to different hexes than this ramp. Keep in step with
 * `apps/admin/DESIGN.md`.
 */
export const KPI_COLORS = {
  inTransit: '#A2D145',
  outForDelivery: '#FBA95B',
  delivered: '#7CB342',
  exceptions: '#E5484D',
  overdue: '#F59E42',
  notTracked: '#9A9A9A',
  total: '#8DC63F',
} as const;
