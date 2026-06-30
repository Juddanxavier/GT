import { and, eq, like, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../db';
import { customers, invoices, shipments } from '../db/schema';
import { getQueryScope, requireBranchScope, requireRole } from '../middleware/authorization';
import type { AppVariables } from './types';

const app = new Hono<{ Variables: AppVariables }>();

app.get(
  '/',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);
    const q = c.req.query('q');
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') ?? '5', 10) || 5, 1), 20);

    if (!q || !q.trim() || q.length > 100) {
      return c.json({ data: { shipments: [], customers: [], invoices: [] } });
    }

    const search = q.trim();

    if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

    const shipConditions: ReturnType<typeof eq>[] = [
      sql`${like(shipments.trackingNo, `%${search}%`)}`,
      eq(shipments.tenantId, scope.tenantId),
    ];
    if (scope.branchId) shipConditions.push(eq(shipments.branchId, scope.branchId));

    const customerConditions: ReturnType<typeof eq>[] = [
      sql`(${like(customers.name, `%${search}%`)} OR ${like(customers.email, `%${search}%`)} OR ${like(customers.phone, `%${search}%`)})`,
      eq(customers.tenantId, scope.tenantId),
    ];
    if (scope.branchId) customerConditions.push(eq(customers.branchId, scope.branchId));

    const invoiceConditions: ReturnType<typeof eq>[] = [
      sql`${like(invoices.invoiceNo, `%${search}%`)}`,
      eq(invoices.tenantId, scope.tenantId),
    ];
    if (scope.branchId) invoiceConditions.push(eq(shipments.branchId, scope.branchId));

    const [shipRows, customerRows, invoiceRows] = await Promise.all([
      db
        .select({
          id: shipments.id,
          trackingNo: shipments.trackingNo,
          status: shipments.status,
          carrier: shipments.carrier,
        })
        .from(shipments)
        .where(and(...shipConditions))
        .limit(limit),
      db
        .select({ id: customers.id, name: customers.name, email: customers.email })
        .from(customers)
        .where(and(...customerConditions))
        .limit(limit),
      db
        .select({
          id: invoices.id,
          invoiceNo: invoices.invoiceNo,
          amount: invoices.amount,
          status: invoices.status,
        })
        .from(invoices)
        .innerJoin(shipments, eq(shipments.id, invoices.shipmentId))
        .where(and(...invoiceConditions))
        .limit(limit),
    ]);

    return c.json({
      data: { shipments: shipRows, customers: customerRows, invoices: invoiceRows },
    });
  },
);

export default app;
