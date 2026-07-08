import { describe, it, expect } from 'vitest';
import {
  createBranchSchema,
  createCustomerSchema,
  createQuotationSchema,
  createShipmentSchema,
  updateQuotationStatusSchema,
  quoteItemSchema,
} from './index.js';

describe('createBranchSchema', () => {
  it('accepts valid branch', () => {
    const r = createBranchSchema.safeParse({ name: 'Mumbai' });
    expect(r.success).toBe(true);
  });

  it('accepts branch with phone', () => {
    const r = createBranchSchema.safeParse({ name: 'Mumbai', phone: '+91 9876543210' });
    expect(r.success).toBe(true);
  });

  it('rejects short name', () => {
    const r = createBranchSchema.safeParse({ name: '' });
    expect(r.success).toBe(false);
  });

  it('rejects invalid phone', () => {
    const r = createBranchSchema.safeParse({ name: 'Mumbai', phone: 'abc' });
    expect(r.success).toBe(false);
  });
});

describe('createCustomerSchema', () => {
  it('accepts valid customer', () => {
    const r = createCustomerSchema.safeParse({ name: 'Acme Corp' });
    expect(r.success).toBe(true);
  });

  it('accepts customer with email', () => {
    const r = createCustomerSchema.safeParse({ name: 'Acme Corp', email: 'a@b.com' });
    expect(r.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const r = createCustomerSchema.safeParse({ name: 'Acme Corp', email: 'not-an-email' });
    expect(r.success).toBe(false);
  });

  it('rejects invalid uuid branchId', () => {
    const r = createCustomerSchema.safeParse({ name: 'Acme Corp', branchId: 'not-a-uuid' });
    expect(r.success).toBe(false);
  });
});

describe('quoteItemSchema', () => {
  it('accepts valid item', () => {
    const r = quoteItemSchema.safeParse({ description: 'Item', rate: '100', amount: '100' });
    expect(r.success).toBe(true);
  });

  it('accepts item with quantity', () => {
    const r = quoteItemSchema.safeParse({ description: 'Item', quantity: '2', rate: '100', amount: '200' });
    expect(r.success).toBe(true);
  });

  it('defaults quantity to 1', () => {
    const r = quoteItemSchema.parse({ description: 'Item', rate: '100', amount: '100' });
    expect(r.quantity).toBe(1);
  });

  it('rejects empty description', () => {
    const r = quoteItemSchema.safeParse({ description: '', rate: '100', amount: '100' });
    expect(r.success).toBe(false);
  });

  it('transforms numeric strings to numbers', () => {
    const r = quoteItemSchema.parse({ description: 'Item', quantity: '3', rate: '50.50', amount: '151.50' });
    expect(r.rate).toBe(50.5);
    expect(r.amount).toBe(151.5);
    expect(r.quantity).toBe(3);
  });
});

describe('createQuotationSchema', () => {
  it('accepts valid quotation', () => {
    const r = createQuotationSchema.safeParse({
      quoteNo: 'Q-001',
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      items: [{ description: 'Item', rate: '100', amount: '100' }],
    });
    expect(r.success).toBe(true);
  });

  it('rejects empty items', () => {
    const r = createQuotationSchema.safeParse({
      quoteNo: 'Q-001',
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      items: [],
    });
    expect(r.success).toBe(false);
  });

  it('rejects missing quoteNo', () => {
    const r = createQuotationSchema.safeParse({
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      items: [{ description: 'Item', rate: '100', amount: '100' }],
    });
    expect(r.success).toBe(false);
  });
});

describe('createShipmentSchema', () => {
  it('accepts valid shipment', () => {
    const r = createShipmentSchema.safeParse({ trackingNo: 'TRACK001' });
    expect(r.success).toBe(true);
  });

  it('accepts full shipment', () => {
    const r = createShipmentSchema.safeParse({
      trackingNo: 'TRACK001',
      customerName: 'John Doe',
      courierCode: 'DHL',
      contactEmail: 'john@example.com',
      contactPhone: '+91 9876543210',
      carrier: 'DHL Express',
      origin: 'Mumbai',
      destination: 'Delhi',
      labelCode: 'LBL001',
      billAmount: '1500',
    });
    expect(r.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const r = createShipmentSchema.safeParse({ trackingNo: 'TRACK001', contactEmail: 'bad' });
    expect(r.success).toBe(false);
  });

  it('rejects empty trackingNo', () => {
    const r = createShipmentSchema.safeParse({ trackingNo: '' });
    expect(r.success).toBe(false);
  });

  it('accepts null customerId', () => {
    const r = createShipmentSchema.safeParse({ trackingNo: 'TRACK001', customerId: null });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.customerId).toBeNull();
  });

  it('accepts missing customerId', () => {
    const r = createShipmentSchema.safeParse({ trackingNo: 'TRACK001' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.customerId).toBeUndefined();
  });
});

describe('updateQuotationStatusSchema', () => {
  it('accepts valid status', () => {
    for (const s of ['draft', 'sent', 'accepted', 'converted', 'rejected'] as const) {
      expect(updateQuotationStatusSchema.safeParse({ status: s }).success).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    const r = updateQuotationStatusSchema.safeParse({ status: 'invalid' });
    expect(r.success).toBe(false);
  });
});
