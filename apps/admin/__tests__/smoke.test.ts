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
    expect(getCurrencySymbol('LKR')).toBe('Rs.');
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


