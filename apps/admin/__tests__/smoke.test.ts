import { describe, it, expect } from 'vitest';

// ── Currency ──

describe('currency', () => {
  it('formatCurrency formats INR', async () => {
    const { formatCurrency } = await import('@/lib/currency');
    expect(formatCurrency(1500, 'INR')).toContain('1,500');
  });

  it('formatCurrency handles null', async () => {
    const { formatCurrency } = await import('@/lib/currency');
    expect(formatCurrency(null, null)).toBeTruthy();
  });

  it('formatCurrency handles string input', async () => {
    const { formatCurrency } = await import('@/lib/currency');
    const result = formatCurrency('50000', 'INR');
    expect(result).toContain('50,000');
  });

  it('getCurrencySymbol returns ₹ for INR', async () => {
    const { getCurrencySymbol } = await import('@/lib/currency');
    expect(getCurrencySymbol('INR')).toBe('₹');
  });

  it('getCurrencySymbol returns Rs for LKR', async () => {
    const { getCurrencySymbol } = await import('@/lib/currency');
    expect(getCurrencySymbol('LKR')).toBe('Rs');
  });

  it('getCurrencySymbol defaults to ₹ for null', async () => {
    const { getCurrencySymbol } = await import('@/lib/currency');
    expect(getCurrencySymbol(null)).toBe('₹');
  });
});

// ── Status Config ──

describe('status config', () => {
  it('STATUS_COLORS has entries for all statuses', async () => {
    const { STATUS_COLORS } = await import('@/lib/status-config');
    expect(STATUS_COLORS.pending).toBe('warning');
    expect(STATUS_COLORS.delivered).toBe('success');
    expect(STATUS_COLORS.exception).toBe('danger');
  });

  it('STATUS_GROUPS has expected groups', async () => {
    const { STATUS_GROUPS } = await import('@/lib/status-config');
    expect(STATUS_GROUPS['In Transit']).toContain('in_transit');
    expect(STATUS_GROUPS.Delivered).toContain('delivered');
  });

  it('STATUS_GROUPS includes Available for Pickup', async () => {
    const { STATUS_GROUPS } = await import('@/lib/status-config');
    expect(Object.keys(STATUS_GROUPS)).toEqual([
      'Pending',
      'In Transit',
      'Delivered',
      'Exception',
      'Available for Pickup',
    ]);
    expect(STATUS_GROUPS['Available for Pickup']).toContain('available_for_pickup');
  });
});

// ── Validation ──

describe('validation', () => {
  it('validateResponse passes through valid data', async () => {
    const { validateResponse, branchSchema } = await import('@/lib/validation');
    const data = {
      id: '1', name: 'B1', phone: null, email: null, address: null,
      tenantId: 't1', createdAt: '2024-01-01', updatedAt: '2024-01-01',
    };
    const result = validateResponse(branchSchema, data, 'test');
    expect(result).toEqual(data);
  });

  it('customerSchema validates customer data', async () => {
    const { customerSchema } = await import('@/lib/validation');
    const result = customerSchema.safeParse({ id: '1', name: 'John' });
    expect(result.success).toBe(true);
  });

  it('customerSchema rejects missing name', async () => {
    const { customerSchema } = await import('@/lib/validation');
    const result = customerSchema.safeParse({ id: '1' });
    expect(result.success).toBe(false);
  });

  it('shipmentSchema validates shipment data', async () => {
    const { shipmentSchema } = await import('@/lib/validation');
    const data = {
      id: '1', trackingNo: 'TN001', status: 'in_transit',
      customerId: null, contactEmail: null, contactPhone: null,
      carrier: null, origin: null, destination: null, billAmount: null,
      labelCode: null, trackingRegistered: false, lastTrackedAt: null,
      createdAt: '2024-01-01',
    };
    const result = shipmentSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

// ── Dashboard stats contract ──

// Spec 0004 AC-11: the business counts ride the `total` block, and the schema is
// what makes a builder that forgets one fail loudly instead of dropping the key
// silently (zod strips unknown keys, it does not keep them).
const dashboardTotal = {
  shipments: { total: 10, inTransit: 2, deliveredToday: 0, exceptions: 0 },
  customers: { total: 42, active: 30, perMonth: [0, 0, 42, 0, 0, 0] },
  quotations: { total: 5, conversionRate: 40 },
  invoices: {
    total: 7,
    revenueThisMonth: '23726.91',
    revenueTotal: '38890.67',
    perMonth: [0, 0, 0, 2, 1, 0],
  },
  rateCards: { total: 4, active: 3 },
  branches: { total: 6 },
};

const dashboardStatsPayload = {
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
  total: dashboardTotal,
};

describe('dashboard stats schema', () => {
  it('keeps total.rateCards and total.branches through validation', async () => {
    const { dashboardStatsSchema } = await import('@/lib/validation');
    const result = dashboardStatsSchema.safeParse(dashboardStatsPayload);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.total?.rateCards).toEqual({ total: 4, active: 3 });
      expect(result.data.total?.branches).toEqual({ total: 6 });
      expect(result.data.total?.invoices).toEqual({
        total: 7,
        revenueThisMonth: '23726.91',
        revenueTotal: '38890.67',
        perMonth: [0, 0, 0, 2, 1, 0],
      });
      // The growth series survive validation too (spec 0004 AC-11).
      expect(result.data.total?.customers?.perMonth).toEqual([0, 0, 42, 0, 0, 0]);
    }
  });

  it('rejects a total that is missing a business count', async () => {
    const { dashboardStatsSchema } = await import('@/lib/validation');
    const { rateCards, ...totalWithoutRateCards } = dashboardTotal;
    const result = dashboardStatsSchema.safeParse({
      ...dashboardStatsPayload,
      total: totalWithoutRateCards,
    });

    expect(result.success).toBe(false);
  });
});


