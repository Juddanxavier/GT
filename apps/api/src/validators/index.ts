import { z } from 'zod';
import { stripHtml } from '../sanitize';

const uuidSchema = z.string().uuid().transform(stripHtml);
const numericString = z.string().regex(/^\d+(\.\d{1,2})?$/);

const phoneRegex = /^\+[\d\s-]{4,20}$/;

export const createBranchSchema = z.object({
  name: z.string().min(1).max(255).transform(stripHtml),
  phone: z.string().regex(phoneRegex, 'Phone must start with + and country code (e.g. +91 9876543210)').max(50).transform(stripHtml).optional().or(z.literal('')),
  email: z.string().email().max(255).transform(stripHtml).optional().or(z.literal('')),
  address: z.string().transform(stripHtml).optional(),
});

export const updateBranchSchema = createBranchSchema.partial();

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(255).transform(stripHtml),
  email: z.string().email().max(255).transform(stripHtml).optional(),
  phone: z.string().regex(phoneRegex, 'Phone must start with + and country code (e.g. +91 9876543210)').max(50).transform(stripHtml).optional().or(z.literal('')),
  address: z.string().transform(stripHtml).optional(),
  branchId: uuidSchema.optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const quoteItemSchema = z.object({
  description: z.string().min(1).transform(stripHtml),
  quantity: numericString.transform(Number).optional().default(1),
  rate: numericString.transform(Number),
  amount: numericString.transform(Number),
  type: z.string().max(100).transform(stripHtml).optional(),
});

export const createQuotationSchema = z.object({
  quoteNo: z.string().min(1).max(50).transform(stripHtml),
  customerId: uuidSchema,
  validUntil: z.string().datetime().transform(stripHtml).optional(),
  notes: z.string().transform(stripHtml).optional(),
  branchId: uuidSchema.optional(),
  items: z.array(quoteItemSchema).min(1),
});

export const updateQuotationSchema = z.object({
  quoteNo: z.string().min(1).max(50).transform(stripHtml).optional(),
  validUntil: z.string().datetime().transform(stripHtml).optional(),
  notes: z.string().transform(stripHtml).optional(),
  branchId: uuidSchema.optional(),
  items: z.array(quoteItemSchema).min(1).optional(),
});

export const updateQuotationStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'accepted', 'converted', 'rejected']),
});

export const createShipmentSchema = z.object({
  trackingNo: z.string().min(1).max(255).transform(stripHtml),
  customerName: z.string().min(1).max(255).transform(stripHtml).optional(),
  courierCode: z.string().max(50).transform(stripHtml).optional(),
  customerId: uuidSchema.optional(),
  contactEmail: z.string().email().max(255).transform(stripHtml).optional(),
  contactPhone: z.string().regex(phoneRegex, 'Phone must start with + and country code (e.g. +91 9876543210)').max(50).transform(stripHtml).optional().or(z.literal('')),
  carrier: z.string().max(100).transform(stripHtml).optional(),
  estimatedDelivery: z.string().datetime().transform(stripHtml).optional(),
  origin: z.string().transform(stripHtml).optional(),
  destination: z.string().transform(stripHtml).optional(),
  labelCode: z.string().max(20).transform(stripHtml).optional(),
  billAmount: z.coerce.number().positive().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  branchId: uuidSchema.optional(),
  tenantId: uuidSchema.optional(),
  status: z.string().max(50).transform(stripHtml).optional(),
});

export const updateShipmentSchema = createShipmentSchema.partial();

export const deactivateShipmentSchema = z.object({
  reason: z.string().transform(stripHtml).optional(),
});

const roleEnum = z.enum(['superadmin', 'tenant-admin', 'staff']);

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().transform(stripHtml).optional(),
  role: roleEnum.optional(),
  branchId: uuidSchema.optional().or(z.literal('')),
  tenantId: uuidSchema.optional().or(z.literal('')),
});

export const updateUserSchema = z.object({
  name: z.string().transform(stripHtml).optional(),
  email: z.string().email().transform(stripHtml).optional(),
  branchId: uuidSchema.optional(),
  role: roleEnum.optional(),
  tenantId: uuidSchema.optional(),
});

export const banUserSchema = z.object({
  banReason: z.string().transform(stripHtml).optional(),
});

export const createInvitationSchema = z.object({
  email: z.string().email(),
  role: roleEnum.optional(),
  branchId: uuidSchema.optional().or(z.literal('')),
  tenantId: uuidSchema.optional().or(z.literal('')),
  name: z.string().transform(stripHtml).optional(),
});

export const updateInvoiceSchema = z.object({
  status: z.string().max(50).optional(),
  notes: z.string().transform(stripHtml).optional(),
  amount: z.string().optional(),
});

export const completeOnboardSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  name: z.string().transform(stripHtml).optional(),
});

export const reportQuerySchema = z.object({
  type: z.enum(['shipments', 'quotations']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const registerCustomerSchema = z.object({
  email: z.string().email().transform(stripHtml),
  password: z.string().min(8),
  name: z.string().min(1).transform(stripHtml),
});

export const updateProfileSchema = z.object({
  name: z.string().transform(stripHtml).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
});

export const fireNotificationSchema = z.object({
  shipmentId: z.string().min(1),
  eventType: z.enum(['InfoReceived', 'InTransit', 'OutForDelivery', 'Delivered', 'Exception']),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
  redirectTo: z.string().optional(),
});
