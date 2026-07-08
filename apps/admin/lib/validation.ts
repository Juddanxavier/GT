import { z } from 'zod';

export const branchSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  tenantId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const shipmentSchema = z.object({
  id: z.string(),
  trackingNo: z.string(),
  status: z.string(),
  customerId: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  carrier: z.string().nullable(),
  origin: z.string().nullable(),
  destination: z.string().nullable(),
  billAmount: z.string().nullable(),
  labelCode: z.string().nullable(),
  trackingRegistered: z.boolean(),
  lastTrackedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
});

export const dashboardAlertSchema = z.object({
  type: z.enum(['stale', 'overdue', 'exception', 'unknown']),
  shipmentId: z.string(),
  trackingNo: z.string(),
  status: z.string(),
  lastTrackedAt: z.string().optional(),
  estimatedDelivery: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const dashboardStatsSchema = z.object({
  role: z.string(),
  scope: z.any(),
  shipments: z.object({
    total: z.number(), inTransit: z.number(), outForDelivery: z.number(),
    deliveredToday: z.number(), deliveredThisMonth: z.number(),
    exceptions: z.number(), pending: z.number(),
    stale: z.number(), overdue: z.number(), notTracked: z.number(),
    byStatus: z.any(),
    perDay: z.array(z.object({ date: z.string(), count: z.number() })),
    byCarrier: z.array(z.object({ carrier: z.string(), count: z.number() })),
    byBranch: z.array(z.object({ branch: z.string(), count: z.number() })),
  }),
  customers: z.object({ total: z.number(), active: z.number() }),
  quotations: z.object({ total: z.number(), converted: z.number(), conversionRate: z.number() }),
  invoices: z.object({ total: z.number(), revenueThisMonth: z.string(), revenueTotal: z.string() }),
  revenuePerMonth: z.array(z.object({ month: z.string(), revenue: z.number() })),
  branches: z.object({ total: z.number() }),
  alerts: z.array(dashboardAlertSchema),
  total: z.object({
    shipments: z.object({ total: z.number(), inTransit: z.number(), deliveredToday: z.number(), exceptions: z.number() }),
    customers: z.object({ total: z.number(), active: z.number() }),
    quotations: z.object({ total: z.number(), conversionRate: z.number() }),
    invoices: z.object({ total: z.number(), revenueThisMonth: z.string(), revenueTotal: z.string() }),
  }).optional(),
  perTenant: z.array(z.any()).optional(),
  perBranch: z.array(z.any()).optional(),
  perDay: z.array(z.object({ date: z.string(), count: z.number() })).optional(),
});

export function validateResponse<T>(schema: z.ZodType<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.warn(`[validation] ${label} response shape mismatch:`, result.error.issues);
  }
  return data as T;
}
