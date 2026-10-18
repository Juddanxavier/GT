'use client';

import { Building2, Receipt, Tags, Users } from 'lucide-react';
import { BentoBoard, bentoRowSpans } from '@/components/bento';
import { KpiCard } from '@/components/kpi-card';
import { formatCurrency } from '@/lib/currency';
import { KPI_COLORS } from './kpi-colors';
import type { KpiItem, Stats } from './types';

/**
 * The business size board: customers, invoices with this month's revenue, rate
 * cards, and branches.
 *
 * The tiles carry standing totals, so their charts show the flow that builds
 * them: customers added per month and invoices raised per month, six monthly
 * points over a fixed window that ignores the shipment range control. A tile
 * with no signal keeps `KpiCard`'s neutral placeholder pill.
 *
 * Staff keep the customers tile only, the same rule that already hides revenue
 * from staff. A tile becomes a link only when one tenant backs the page: every
 * list endpoint returns 400 without a tenant, so an unfiltered superadmin would
 * be sent to a broken page.
 */
export function BusinessOverview({
  stats,
  tenantCurrency,
  isSingleTenant,
}: {
  stats: Stats;
  /** The tenant currency code. Undefined when no single tenant is resolved. */
  tenantCurrency?: string;
  /** True when one tenant's data backs the page, so its list links resolve. */
  isSingleTenant: boolean;
}) {
  const t = stats.total;
  if (!t) return null;

  const isStaff = stats.role === 'staff';
  const linkTo = (path: string) => (isSingleTenant ? path : undefined);
  const tenantCount = stats.perTenant?.length ?? 0;

  // Two tenants can hold different currencies, so a currency figure is only
  // printed when one tenant backs the page. Otherwise the count leads and the
  // sublabel names how many tenants the number covers.
  const invoiceValue = isSingleTenant
    ? formatCurrency(t.invoices.revenueThisMonth, tenantCurrency)
    : t.invoices.total;
  const invoiceSublabel = isSingleTenant
    ? `${t.invoices.total} invoices`
    : tenantCount > 0
      ? `across ${tenantCount} tenants`
      : 'across all tenants';

  // The staff rule drops these three tiles, so they are built in their own typed
  // array: a spread is not contextually typed, and an untyped literal would widen
  // `chart` and `sparkUnit` to `string`.
  const secondaryTiles: (KpiItem & { key: string })[] = isStaff
    ? []
    : [
        {
          key: 'invoices',
          label: 'Invoices',
          value: invoiceValue,
          sublabel: invoiceSublabel,
          icon: Receipt,
          color: KPI_COLORS.invoices,
          href: linkTo('/invoices'),
          spark: t.invoices.perMonth,
          sparkUnit: 'month',
          chart: 'bars',
          signalCount: t.invoices.total,
        },
        {
          key: 'rateCards',
          label: 'Rate cards',
          value: t.rateCards.total,
          sublabel: `${t.rateCards.active} active`,
          icon: Tags,
          color: KPI_COLORS.rateCards,
          href: linkTo('/rate-cards'),
        },
        {
          key: 'branches',
          label: 'Branches',
          value: t.branches.total,
          icon: Building2,
          color: KPI_COLORS.branches,
          href: linkTo('/branches'),
        },
      ];

  const tiles: (KpiItem & { key: string })[] = [
    {
      key: 'customers',
      label: 'Customers',
      value: t.customers.total,
      sublabel: `${t.customers.active} active`,
      icon: Users,
      color: KPI_COLORS.customers,
      href: linkTo('/customers'),
      spark: t.customers.perMonth,
      sparkUnit: 'month',
    },
    ...secondaryTiles,
  ];

  const spans = bentoRowSpans(tiles.length);

  return (
    <>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted/70 px-0.5">
        Business Overview
      </h2>

      <BentoBoard>
        {tiles.map(({ key, ...tile }, i) => (
          <KpiCard key={key} {...tile} size={spans[i]} revealDelay={360 + i * 60} />
        ))}
      </BentoBoard>
    </>
  );
}
