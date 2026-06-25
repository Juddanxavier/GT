import { Hono } from 'hono';
import { eq, and, desc, sql, like } from 'drizzle-orm';
import { db } from '../db';
import { invoices, shipments, tenants } from '../db/schema';
import { requireRole, requireBranchScope, getQueryScope } from '../middleware/authorization';
import type { AppVariables } from './types';
import { getInvoiceData, getInvoiceByShipmentId, generateInvoicePdf, canSendToday } from '../invoice/service';
import { emailQueue } from '../queues';
import { emitToTenant } from '../realtime';

const app = new Hono<{ Variables: AppVariables }>();

// Must be before /:id routes to avoid 'shipment' matching as :id
app.get('/shipment/:shipmentId', requireRole('superadmin', 'tenant-admin', 'staff'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const shipmentId = c.req.param('shipmentId');
  if (!shipmentId) return c.json({ error: 'Invalid request' }, 400);

  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

  // Verify branch scope
  if (scope.branchId) {
    const [ship] = await db
      .select({ id: shipments.id })
      .from(shipments)
      .where(and(eq(shipments.id, shipmentId), eq(shipments.branchId, scope.branchId)))
      .limit(1);
    if (!ship) return c.json({ error: 'Shipment not found' }, 404);
  }

  const data = await getInvoiceByShipmentId(shipmentId, scope.tenantId);
  return c.json({ data: data ?? null });
});

app.post('/shipment/:shipmentId', requireRole('superadmin', 'tenant-admin', 'staff'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const shipmentId = c.req.param('shipmentId');
  if (!scope.tenantId || !shipmentId) return c.json({ error: 'Invalid request' }, 400);

  // Check invoice doesn't already exist
  const [existing] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.shipmentId, shipmentId), eq(invoices.tenantId, scope.tenantId)))
    .limit(1);

  if (existing) return c.json({ error: 'Invoice already exists for this shipment' }, 409);

  // Get shipment + customer + tenant
  const shipConditions: ReturnType<typeof eq>[] = [eq(shipments.id, shipmentId), eq(shipments.tenantId, scope.tenantId)];
  if (scope.branchId) shipConditions.push(eq(shipments.branchId, scope.branchId));
  const [ship] = await db
    .select()
    .from(shipments)
    .where(and(...shipConditions))
    .limit(1);

  if (!ship) return c.json({ error: 'Shipment not found' }, 404);

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const shortId = ship.id.slice(0, 5).toUpperCase();
  const invoiceNo = `INV-${y}${m}-${shortId}`;
  const amount = ship.billAmount ?? '0';

  const invoiceValues = {
    tenantId: scope.tenantId,
    shipmentId: ship.id,
    customerId: ship.customerId ?? null,
    invoiceNo,
    amount: String(amount),
    status: 'paid' as const,
    emailCount: 0,
    paidAt: now,
    lastEmailSentAt: now,
  };

  const [inv] = await db
    .insert(invoices)
    .values(invoiceValues)
    .returning();

  if (!inv) return c.json({ error: 'Failed to create invoice' }, 500);

  emitToTenant(scope.tenantId, 'dashboard:update', {}).catch((err) => console.error('[invoices] emit error:', err));
  return c.json({ data: inv }, 201);
});

app.get('/', requireRole('superadmin', 'tenant-admin', 'staff'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);

  const search = c.req.query('search');
  const page = Math.max(1, Number(c.req.query('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit')) || 50));
  const offset = (page - 1) * limit;

  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

  const conditions: ReturnType<typeof eq>[] = [eq(invoices.tenantId, scope.tenantId)];
  if (scope.branchId) conditions.push(eq(shipments.branchId, scope.branchId));
  if (search) conditions.push(sql`${like(invoices.invoiceNo, `%${search}%`)}`);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoices)
    .innerJoin(shipments, eq(shipments.id, invoices.shipmentId))
    .where(and(...conditions));

  const rows = await db
    .select({
      id: invoices.id,
      invoiceNo: invoices.invoiceNo,
      amount: invoices.amount,
      status: invoices.status,
      emailCount: invoices.emailCount,
      paidAt: invoices.paidAt,
      createdAt: invoices.createdAt,
      trackingNo: shipments.trackingNo,
      customerId: invoices.customerId,
    })
    .from(invoices)
    .innerJoin(shipments, eq(shipments.id, invoices.shipmentId))
    .where(and(...conditions))
    .orderBy(desc(invoices.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({ data: rows, total: Number(count), page, limit });
});

app.get('/:id', requireRole('superadmin', 'tenant-admin', 'staff'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Tenant required' }, 400);

  const data = await getInvoiceData(id, scope.tenantId ?? null);
  if (!data) return c.json({ error: 'Invoice not found' }, 404);

  // Staff can only view invoices for their branch
  if (scope.branchId && data.shipmentBranchId && data.shipmentBranchId !== scope.branchId) {
    return c.json({ error: 'Invoice not found' }, 404);
  }

  return c.json({ data });
});

app.get('/:id/pdf', requireRole('superadmin', 'tenant-admin', 'staff'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Tenant required' }, 400);

  const data = await getInvoiceData(id, scope.tenantId ?? null);
  if (!data) return c.json({ error: 'Invoice not found' }, 404);

  if (scope.branchId && data.shipmentBranchId && data.shipmentBranchId !== scope.branchId) {
    return c.json({ error: 'Invoice not found' }, 404);
  }

  const pdf = await generateInvoicePdf(data);

  return new Response(pdf as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${data.invoiceNo}.pdf"`,
    },
  });
});

app.post('/:id/send', requireRole('superadmin', 'tenant-admin', 'staff'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const id = c.req.param('id');
  if (!scope.tenantId || !id) return c.json({ error: 'Tenant required' }, 400);

  const [inv] = await db
    .select({ id: invoices.id, emailCount: invoices.emailCount, lastEmailSentAt: invoices.lastEmailSentAt, shipmentId: invoices.shipmentId })
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.tenantId, scope.tenantId)))
    .limit(1);

  if (!inv) return c.json({ error: 'Invoice not found' }, 404);

  if (!canSendToday(inv)) {
    return c.json({ error: 'Max 2 invoice emails per day. Try again tomorrow.' }, 429);
  }

  const data = await getInvoiceData(inv.id, scope.tenantId);
  if (!data) return c.json({ error: 'Invoice data not found' }, 404);

  if (scope.branchId && data.shipmentBranchId && data.shipmentBranchId !== scope.branchId) {
    return c.json({ error: 'Invoice not found' }, 404);
  }

  const pdf = await generateInvoicePdf(data);

  if (!emailQueue) return c.json({ error: 'Email queue not available' }, 500);

  await emailQueue.add('invoice', {
    invoiceId: inv.id,
    shipmentId: data.shipmentId,
    pdfBase64: pdf.toString('base64'),
  });

  await db
    .update(invoices)
    .set({
      emailCount: sql<number>`${invoices.emailCount} + 1`,
      lastEmailSentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, inv.id));

  emitToTenant(scope.tenantId, 'dashboard:update', {}).catch((err) => console.error('[invoices] emit error:', err));

  return c.json({ data: { sent: true, emailCount: Number(inv.emailCount) + 1 } });
});

export default app;
