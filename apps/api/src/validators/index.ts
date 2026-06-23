import { z } from 'zod';

const uuidSchema = z.string().uuid();
const numericString = z.string().regex(/^\d+(\.\d{1,2})?$/);

// ── Branch ──

const phoneRegex = /^\+[\d\s-]{4,20}$/;

export const createBranchSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().regex(phoneRegex, 'Phone must start with + and country code (e.g. +91 9876543210)').max(50).optional().or(z.literal('')),
  email: z.string().email().max(255).optional().or(z.literal('')),
  address: z.string().optional(),
});

export const updateBranchSchema = createBranchSchema.partial();

// ── Customer ──

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255).optional(),
  phone: z.string().regex(phoneRegex, 'Phone must start with + and country code (e.g. +91 9876543210)').max(50).optional().or(z.literal('')),
  address: z.string().optional(),
  branchId: uuidSchema.optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

// ── Quote Item ──

export const quoteItemSchema = z.object({
  description: z.string().min(1),
  quantity: numericString.transform(Number).optional().default(1),
  rate: numericString.transform(Number),
  amount: numericString.transform(Number),
  type: z.string().max(100).optional(),
});

// ── Quotation ──

export const createQuotationSchema = z.object({
  quoteNo: z.string().min(1).max(50),
  customerId: uuidSchema,
  validUntil: z.string().datetime().optional(),
  notes: z.string().optional(),
  branchId: uuidSchema.optional(),
  items: z.array(quoteItemSchema).min(1),
});

export const updateQuotationSchema = z.object({
  quoteNo: z.string().min(1).max(50).optional(),
  validUntil: z.string().datetime().optional(),
  notes: z.string().optional(),
  branchId: uuidSchema.optional(),
  items: z.array(quoteItemSchema).min(1).optional(),
});

export const updateQuotationStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'accepted', 'converted', 'rejected']),
});

// ── Shipment ──

export const createShipmentSchema = z.object({
  trackingNo: z.string().min(1).max(255),
  customerName: z.string().min(1).max(255).optional(),
  courierCode: z.string().max(50).optional(),
  customerId: uuidSchema.optional(),
  contactEmail: z.string().email().max(255).optional(),
  contactPhone: z.string().regex(phoneRegex, 'Phone must start with + and country code (e.g. +91 9876543210)').max(50).optional().or(z.literal('')),
  carrier: z.string().max(100).optional(),
  estimatedDelivery: z.string().datetime().optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  labelCode: z.string().max(20).optional(),
  billAmount: z.coerce.number().positive().optional(),
  payload: z.record(z.unknown()).optional(),
  branchId: uuidSchema.optional(),
  tenantId: uuidSchema.optional(),
});

export const updateShipmentSchema = createShipmentSchema.partial();

export const deactivateShipmentSchema = z.object({
  reason: z.string().optional(),
});
