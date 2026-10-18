import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BusinessOverview } from '@/components/dashboard/business-overview';
import type { Stats } from '@/components/dashboard/types';

// next/link expects an app router around it. The link gate only cares that a tile
// becomes an anchor carrying the right href, so a plain anchor stands in.
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children?: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const baseTotal: NonNullable<Stats['total']> = {
  shipments: { total: 10, inTransit: 2, deliveredToday: 0, exceptions: 0 },
  customers: { total: 42, active: 30, perMonth: [0, 0, 7, 0, 0, 0] },
  quotations: { total: 5, conversionRate: 40 },
  invoices: {
    total: 7,
    revenueThisMonth: '123456.00',
    revenueTotal: '900000.00',
    perMonth: [0, 0, 0, 2, 1, 0],
  },
  rateCards: { total: 4, active: 3 },
  branches: { total: 6 },
};

function makeStats(
  overrides: Partial<Stats> = {},
  totalOverrides: Partial<NonNullable<Stats['total']>> = {},
): Stats {
  return {
    role: 'tenant-admin',
    scope: { tenantId: 't1', branchId: null },
    shipments: {
      total: 10,
      inTransit: 2,
      outForDelivery: 1,
      deliveredToday: 0,
      deliveredThisMonth: 3,
      exceptions: 0,
      pending: 1,
      stale: 0,
      overdue: 0,
      notTracked: 0,
      byStatus: {},
      perDay: [],
      byCarrier: [],
      byBranch: [],
    },
    revenuePerMonth: [],
    alerts: [],
    ...overrides,
    total: { ...baseTotal, ...totalOverrides },
  };
}

function renderBoard(
  props: Partial<Parameters<typeof BusinessOverview>[0]> = {},
): ReturnType<typeof render> {
  return render(<BusinessOverview stats={makeStats()} isSingleTenant {...props} />);
}

describe('BusinessOverview', () => {
  it('AC-2, AC-3, AC-4, AC-5, AC-6: renders four tiles in order with their values', () => {
    renderBoard({ tenantCurrency: 'LKR' });

    expect(screen.getByText('Customers')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
    expect(screen.getByText('30 active')).toBeTruthy();

    expect(screen.getByText('Invoices')).toBeTruthy();
    expect(screen.getByText('Rs123,456')).toBeTruthy();
    expect(screen.getByText('7 invoices')).toBeTruthy();

    expect(screen.getByText('Rate cards')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('3 active')).toBeTruthy();

    expect(screen.getByText('Branches')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();

    const body = document.body.textContent ?? '';
    expect(body.indexOf('Customers')).toBeLessThan(body.indexOf('Invoices'));
    expect(body.indexOf('Invoices')).toBeLessThan(body.indexOf('Rate cards'));
    expect(body.indexOf('Rate cards')).toBeLessThan(body.indexOf('Branches'));
  });

  it('AC-6: the Branches tile carries no sublabel', () => {
    renderBoard({ tenantCurrency: 'INR' });

    const branchesTile = screen.getByText('Branches').closest('a');
    // Label, the neutral placeholder pill, then the value. A sublabel would
    // append a fourth run of text.
    expect(branchesTile?.textContent).toBe('Branches\u20146');
  });

  it('AC-7: a staff session sees the Customers tile and none of the other three', () => {
    renderBoard({ stats: makeStats({ role: 'staff' }), tenantCurrency: 'INR' });

    expect(screen.getByText('Customers')).toBeTruthy();
    expect(screen.queryByText('Invoices')).toBeNull();
    expect(screen.queryByText('Rate cards')).toBeNull();
    expect(screen.queryByText('Branches')).toBeNull();
  });

  it('AC-8: tiles link to their list pages when a single tenant is resolved', () => {
    renderBoard({ tenantCurrency: 'INR' });

    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/customers', '/invoices', '/rate-cards', '/branches']);
  });

  it('AC-8: no tile links anywhere when no tenant is resolved', () => {
    renderBoard({ stats: makeStats({ role: 'superadmin' }), isSingleTenant: false });

    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('AC-14: an unfiltered superadmin gets a count, a tenant sublabel, and no currency figure', () => {
    const perTenant: Stats['perTenant'] = [
      {
        tenantId: 't1',
        tenantName: 'Gajan',
        shipments: { total: 1, inTransit: 0, deliveredToday: 0, exceptions: 0 },
        invoices: { revenueTotal: '1', revenueThisMonth: '1' },
        branches: { total: 1 },
      },
      {
        tenantId: 't2',
        tenantName: 'Lanka Mahal',
        shipments: { total: 2, inTransit: 0, deliveredToday: 0, exceptions: 0 },
        invoices: { revenueTotal: '2', revenueThisMonth: '2' },
        branches: { total: 2 },
      },
    ];

    renderBoard({
      stats: makeStats({ role: 'superadmin', perTenant }),
      isSingleTenant: false,
    });

    expect(screen.getByText('Invoices')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('across 2 tenants')).toBeTruthy();
    expect(document.body.textContent).not.toContain('Rs');
    expect(document.body.textContent).not.toContain('₹');
  });

  it('AC-10: a zero value or an all zero series renders no chart', () => {
    const { container } = renderBoard({
      tenantCurrency: 'INR',
      stats: makeStats(
        {},
        {
          // All zero series drop the two charts without a second `0` on screen.
          customers: { total: 42, active: 30, perMonth: [0, 0, 0, 0, 0, 0] },
          invoices: {
            total: 7,
            revenueThisMonth: '123456.00',
            revenueTotal: '900000.00',
            perMonth: [0, 0, 0, 0, 0, 0],
          },
          rateCards: { total: 0, active: 0 },
        },
      ),
    });

    expect(screen.getByText('Rate cards')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
    expect(screen.getByText('0 active')).toBeTruthy();
    // One glyph per tile and nothing else: the no signal rule drops every chart.
    expect(container.querySelectorAll('svg')).toHaveLength(4);
  });

  it('AC-16, AC-17, AC-18: the two charted tiles draw a chart and label the window in months', () => {
    const { container } = renderBoard({ tenantCurrency: 'INR' });

    // Customers is the feature tile, so it draws the large area chart plus its
    // glyph: two svgs. Invoices draws bars (divs) plus its glyph: one svg.
    expect(screen.getByText('Customers').closest('a')?.querySelectorAll('svg')).toHaveLength(2);
    expect(screen.getByText('Invoices').closest('a')?.querySelectorAll('svg')).toHaveLength(1);

    // The footer names the window in months, not days.
    expect(container.textContent).toContain('6mo');
    expect(container.textContent).not.toContain('6d');
  });

  it('AC-13: the section heading is a level two heading, like Shipment Overview', () => {
    renderBoard({ tenantCurrency: 'INR' });

    expect(screen.getByRole('heading', { level: 2, name: 'Business Overview' })).toBeTruthy();
  });
});
