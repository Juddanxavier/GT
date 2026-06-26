import { Hono } from 'hono';
import { eq, and, desc, sql, like } from 'drizzle-orm';
import { db } from '../db';
import { invoices, shipments, tenants, customers } from '../db/schema';
import { requireRole, requireBranchScope, getQueryScope } from '../middleware/authorization';
import { withCache, cacheDel, cacheDelPattern } from '../cache';
import type { AppVariables } from './types';
import { getInvoiceData, getInvoiceByShipmentId, generateInvoicePdf, canSendToday } from '../invoice/service';
import { emailQueue } from '../queues';
import { emitToTenant } from '../realtime';
import { logAudit } from '../services/audit';

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

  const data = await withCache(scope.tenantId, `invoices:shipment:${shipmentId}`, () => getInvoiceByShipmentId(shipmentId, scope.tenantId), 120);
  return c.json({ data: data ?? null });
});

app.post('/shipment/:shipmentId', requireRole('superadmin', 'tenant-admin', 'staff'), requireBranchScope(), async (c) => {
  try {
    const scope = getQueryScope(c);
    const shipmentId = c.req.param('shipmentId');
    if (!scope.tenantId || !shipmentId) return c.json({ error: 'Invalid request' }, 400);

    const [existing] = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(and(eq(invoices.shipmentId, shipmentId), eq(invoices.tenantId, scope.tenantId)))
      .limit(1);

    if (existing) {
      await cacheDel(scope.tenantId!, `invoices:shipment:${shipmentId}`);
      return c.json({ error: 'Invoice already exists for this shipment' }, 409);
    }

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
      branchId: ship.branchId ?? null,
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

    await cacheDel(scope.tenantId!, `invoices:shipment:${shipmentId}`);
    await cacheDelPattern(scope.tenantId, 'invoices:list:*');
    logAudit('INVOICE_CREATED', c.get('user')?.id ?? null, {
      invoiceId: inv.id, invoiceNo, shipmentId, amount, tenantId: scope.tenantId,
    }, c);
    emitToTenant(scope.tenantId, 'dashboard:update', {});
    return c.json({ data: inv }, 201);
  } catch (err) {
    const message = err instanceof Error ? `${err.name}: ${err.message}` : `Non-Error thrown: ${String(err)}`;
    console.error('[invoices] POST /shipment/:shipmentId unhandled error:', message, err);
    return c.json({ error: message }, 500);
  }
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

  const cacheKey = `invoices:list:${scope.branchId ?? 'all'}:${search ?? ''}:${page}:${limit}`;
  const result = await withCache(scope.tenantId, cacheKey, async () => {
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
        customerName: customers.name,
      })
      .from(invoices)
      .innerJoin(shipments, eq(shipments.id, invoices.shipmentId))
      .leftJoin(customers, eq(customers.id, invoices.customerId))
      .where(and(...conditions))
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset);

    return { rows, total: Number(count), page, limit };
  }, 120);

  return c.json({ data: result.rows, total: result.total, page: result.page, limit: result.limit });
});

app.get('/:id', requireRole('superadmin', 'tenant-admin', 'staff'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Tenant required' }, 400);

  const data = await withCache(scope.tenantId!, `invoices:${id}`, () => getInvoiceData(id, scope.tenantId ?? null), 120);
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

  const data = await withCache(scope.tenantId!, `invoices:${id}:data`, () => getInvoiceData(id, scope.tenantId ?? null), 120);
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
    .select({ id: invoices.id, emailCount: invoices.emailCount, lastEmailSentAt: invoices.lastEmailSentAt, shipmentId: invoices.shipmentId, customerId: invoices.customerId })
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.tenantId, scope.tenantId)))
    .limit(1);

  if (!inv) return c.json({ error: 'Invoice not found' }, 404);

  if (!canSendToday(inv)) {
    return c.json({ error: 'Max 2 invoice emails per day. Try again tomorrow.' }, 429);
  }

  if (!inv.customerId) return c.json({ error: 'Cannot send — no customer assigned to this invoice. Assign a customer to the shipment first.' }, 400);

  const [cust] = await db
    .select({ email: customers.email })
    .from(customers)
    .where(eq(customers.id, inv.customerId))
    .limit(1);

  if (!cust?.email) return c.json({ error: 'Customer has no email address' }, 400);

  const data = await getInvoiceData(inv.id, scope.tenantId);
  if (!data) return c.json({ error: 'Invoice data not found' }, 404);

  if (scope.branchId && data.shipmentBranchId && data.shipmentBranchId !== scope.branchId) {
    return c.json({ error: 'Invoice not found' }, 404);
  }

  const pdf = await generateInvoicePdf(data);

  if (!emailQueue) return c.json({ error: 'Email queue not available' }, 500);

  await emailQueue.add('invoice', {
    invoiceId: inv.id,
    tenantId: scope.tenantId,
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

  await cacheDel(scope.tenantId!, `invoices:${id}`);
  await cacheDel(scope.tenantId!, `invoices:${id}:data`);
  logAudit('INVOICE_SENT', c.get('user')?.id ?? null, {
    invoiceId: id, customerId: inv.customerId, email: cust.email, tenantId: scope.tenantId,
  }, c);
  emitToTenant(scope.tenantId, 'dashboard:update', {});

  return c.json({ data: { sent: true, emailCount: Number(inv.emailCount) + 1 } });
});

app.patch('/:id', requireRole('superadmin', 'tenant-admin'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const id = c.req.param('id');
  if (!scope.tenantId || !id) return c.json({ error: 'Tenant required' }, 400);

  const body = await c.req.json();
  const allowed = ['status', 'notes', 'amount'];
  const filtered = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  );
  if (Object.keys(filtered).length === 0) return c.json({ error: 'No valid fields to update' }, 400);

  const [existing] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.tenantId, scope.tenantId)))
    .limit(1);
  if (!existing) return c.json({ error: 'Invoice not found' }, 404);

  const [row] = await db
    .update(invoices)
    .set({ ...filtered, updatedAt: new Date() })
    .where(and(eq(invoices.id, id), eq(invoices.tenantId, scope.tenantId)))
    .returning();

  await cacheDel(scope.tenantId!, `invoices:${id}`);
  await cacheDel(scope.tenantId!, `invoices:${id}:data`);
  await cacheDelPattern(scope.tenantId, 'invoices:list:*');

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(filtered)) {
    const oldVal = (existing as Record<string, unknown>)[key];
    const newVal = filtered[key];
    if (String(oldVal) !== String(newVal)) changes[key] = { from: oldVal, to: newVal };
  }
  if (Object.keys(changes).length > 0) {
    logAudit('INVOICE_UPDATED', c.get('user')?.id ?? null, {
      invoiceId: id, invoiceNo: existing.invoiceNo, changes, tenantId: scope.tenantId,
    }, c);
  }

  emitToTenant(scope.tenantId, 'dashboard:update', {});
  return c.json({ data: row });
});

app.delete('/:id', requireRole('superadmin', 'tenant-admin'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const id = c.req.param('id');
  if (!scope.tenantId || !id) return c.json({ error: 'Tenant required' }, 400);

  const [existing] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.tenantId, scope.tenantId)))
    .limit(1);
  if (!existing) return c.json({ error: 'Invoice not found' }, 404);

  await db
    .delete(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.tenantId, scope.tenantId)));

  await cacheDel(scope.tenantId!, `invoices:${id}`);
  await cacheDel(scope.tenantId!, `invoices:${id}:data`);
  await cacheDelPattern(scope.tenantId, 'invoices:list:*');
  logAudit('INVOICE_DELETED', c.get('user')?.id ?? null, {
    invoiceId: id, invoiceNo: existing.invoiceNo, tenantId: scope.tenantId,
  }, c);
  emitToTenant(scope.tenantId, 'dashboard:update', {});

  return c.json({ data: { success: true } });
});

export default app;
