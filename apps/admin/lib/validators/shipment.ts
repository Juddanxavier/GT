import { z } from 'zod';

const uuidSchema = z.string().uuid();

export const createShipmentSchema = z.object({
  trackingNo: z.string().trim().min(1, 'Tracking number is required').max(100, 'Max 100 characters'),
  customerName: z.string().trim().min(1, 'Customer name is required').max(255).optional(),
  customerId: uuidSchema.optional(),
  courierCode: z.string().max(50).optional(),
  carrier: z.string().max(100).optional(),
  contactEmail: z.string().email().max(255).optional().or(z.literal('')),
  contactPhone: z.string().max(50).optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  billAmount: z.coerce.number().min(0, 'Must be 0 or more').optional(),
  branchId: uuidSchema.optional(),
});

export const updateShipmentSchema = z.object({
  trackingNo: z.string().trim().min(1, 'Tracking number is required').max(100, 'Max 100 characters').optional(),
  customerName: z.string().trim().min(1, 'Customer name is required').max(255).optional(),
  customerId: uuidSchema.optional(),
  courierCode: z.string().max(50).optional(),
  carrier: z.string().max(100).optional(),
  contactEmail: z.string().email().max(255).optional().or(z.literal('')),
  contactPhone: z.string().max(50).optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  billAmount: z.coerce.number().min(0, 'Must be 0 or more').optional(),
  status: z.string().optional(),
  branchId: uuidSchema.optional(),
});

export type CreateShipmentData = z.infer<typeof createShipmentSchema>;
export type UpdateShipmentData = z.infer<typeof updateShipmentSchema>;

export function toFieldErrors(error: unknown): Record<string, string> {
  if (error instanceof z.ZodError) {
    const errors: Record<string, string> = {};
    for (const issue of error.issues) {
      const field = issue.path.length > 0 ? String(issue.path[0]) : '_root';
      if (!errors[field]) errors[field] = issue.message;
    }
    return errors;
  }
  return {};
}
