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

const shipmentTrendRowSchema = z.object({
  date: z.string(),
  total: z.number(),
  intransit: z.number(),
  outfordelivery: z.number().optional(),
  delivered: z.number(),
  pending: z.number(),
  exception: z.number().optional(),
});

const perDaySchema = z.object({ date: z.string(), count: z.number() });

export const dashboardStatsSchema = z.object({
  role: z.string(),
  scope: z.record(z.string(), z.string().nullable()),
  shipments: z.object({
    total: z.number(),
    inTransit: z.number(),
    outForDelivery: z.number(),
    deliveredToday: z.number(),
    deliveredThisMonth: z.number(),
    exceptions: z.number(),
    pending: z.number(),
    stale: z.number(),
    overdue: z.number(),
    notTracked: z.number(),
    byStatus: z.record(z.string(), z.number()),
    perDay: z.array(perDaySchema),
    byCarrier: z.array(z.object({ carrier: z.string(), count: z.number() })),
    byBranch: z.array(z.object({ branch: z.string(), count: z.number() })),
  }),
  customers: z.object({ total: z.number(), active: z.number() }).optional(),
  quotations: z.object({ total: z.number(), converted: z.number(), conversionRate: z.number() }).optional(),
  invoices: z.object({ total: z.number(), revenueThisMonth: z.string(), revenueTotal: z.string() }).optional(),
  revenuePerMonth: z.array(z.object({ month: z.string(), revenue: z.number() })),
  branches: z.object({ total: z.number() }).optional(),
  alerts: z.array(dashboardAlertSchema),
  shipmentTrend: z.array(shipmentTrendRowSchema).optional(),
  total: z
    .object({
      shipments: z.object({
        total: z.number(),
        inTransit: z.number(),
        deliveredToday: z.number(),
        exceptions: z.number(),
        overdue: z.number().optional(),
        notTracked: z.number().optional(),
      }),
      customers: z.object({
        total: z.number(),
        active: z.number(),
        perMonth: z.array(z.number()),
      }),
      quotations: z.object({ total: z.number(), conversionRate: z.number() }),
      invoices: z.object({
        total: z.number(),
        revenueThisMonth: z.string(),
        revenueTotal: z.string(),
        perMonth: z.array(z.number()),
      }),
      rateCards: z.object({ total: z.number(), active: z.number() }),
      branches: z.object({ total: z.number() }),
    })
    .optional(),
  perTenant: z
    .array(
      z.object({
        tenantId: z.string(),
        tenantName: z.string(),
        shipments: z.object({
          total: z.number(),
          inTransit: z.number(),
          deliveredToday: z.number(),
          exceptions: z.number(),
        }),
        invoices: z.object({ revenueTotal: z.string(), revenueThisMonth: z.string() }),
        branches: z.object({ total: z.number() }),
      }),
    )
    .optional(),
  perBranch: z
    .array(
      z.object({
        branchId: z.string(),
        branchName: z.string(),
        shipments: z.object({
          total: z.number(),
          inTransit: z.number(),
          deliveredToday: z.number(),
          exceptions: z.number(),
        }),
        invoices: z.object({ revenueTotal: z.string(), revenueThisMonth: z.string() }),
        customers: z.object({ total: z.number(), active: z.number() }),
      }),
    )
    .optional(),
  perDay: z.array(perDaySchema).optional(),
  deliveryFlow: z.array(perDaySchema).optional(),
});

export function validateResponse<T>(schema: z.ZodType<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const msg = `[validation] ${label} response shape mismatch`;
    if (process.env.NODE_ENV === 'production') {
      console.error(msg, result.error.issues);
      throw new Error(`${msg}: ${result.error.issues.map((i) => i.path.join('.')).join(', ')}`);
    }
    console.warn(msg, result.error.issues);
    return data as T;
  }
  return result.data;
}
