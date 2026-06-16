import { Hono } from 'hono';
import { eq, and, desc, sql, like } from 'drizzle-orm';
import { db } from '../db';
import { invoices, shipments, tenants, customers } from '../db/schema';
import { requireRole } from '../middleware/authorization';
import type { AppVariables } from './types';
import { getInvoiceData, getInvoiceByShipmentId, generateInvoicePdf, canSendToday } from '../invoice/service';
import { emailQueue } from '../queues';
import { emitToTenant } from '../realtime';

const app = new Hono<{ Variables: AppVariables }>();

// Must be before /:id routes to avoid 'shipment' matching as :id
app.get('/shipment/:shipmentId', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const tenantId = c.get('tenantId');
  const shipmentId = c.req.param('shipmentId');
  if (!tenantId || !shipmentId) return c.json({ error: 'Invalid request' }, 400);

  const data = await getInvoiceByShipmentId(shipmentId, tenantId);
  return c.json({ data: data ?? null });
});

app.post('/shipment/:shipmentId', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const tenantId = c.get('tenantId');
  const shipmentId = c.req.param('shipmentId');
  if (!tenantId || !shipmentId) return c.json({ error: 'Invalid request' }, 400);

  // Check invoice doesn't already exist
  const [existing] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.shipmentId, shipmentId), eq(invoices.tenantId, tenantId)))
    .limit(1);

  if (existing) return c.json({ error: 'Invoice already exists for this shipment' }, 409);

  // Get shipment + customer + tenant
  const [ship] = await db
    .select()
    .from(shipments)
    .where(and(eq(shipments.id, shipmentId), eq(shipments.tenantId, tenantId)))
    .limit(1);

  if (!ship) return c.json({ error: 'Shipment not found' }, 404);
  if (!ship.customerId) return c.json({ error: 'Shipment has no customer — cannot create invoice' }, 400);

  const [tenant] = await db
    .select({ name: tenants.name })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const shortId = ship.id.slice(0, 5).toUpperCase();
  const invoiceNo = `INV-${y}${m}-${shortId}`;
  const amount = ship.billAmount ?? '0';

  const [inv] = await db
    .insert(invoices)
    .values({
      tenantId,
      shipmentId: ship.id,
      customerId: ship.customerId,
      invoiceNo,
      amount: String(amount),
      status: 'paid',
      emailCount: 0,
      paidAt: now,
      lastEmailSentAt: now,
    } as never)
    .returning();

  if (!inv) return c.json({ error: 'Failed to create invoice' }, 500);

  emitToTenant(tenantId, 'dashboard:update', {}).catch(() => {});
  return c.json({ data: inv }, 201);
});

app.get('/', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const search = c.req.query('search');

  const conditions = [eq(invoices.tenantId, tenantId)];
  if (search) conditions.push(sql`${like(invoices.invoiceNo, `%${search}%`)}`);

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
    .orderBy(desc(invoices.createdAt));

  return c.json({ data: rows });
});

app.get('/:id', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const tenantId = c.get('tenantId');
  const id = c.req.param('id');
  if (!tenantId || !id) return c.json({ error: 'Tenant required' }, 400);

  const data = await getInvoiceData(id, tenantId);
  if (!data) return c.json({ error: 'Invoice not found' }, 404);

  return c.json({ data });
});

app.get('/:id/pdf', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const tenantId = c.get('tenantId');
  const id = c.req.param('id');
  if (!tenantId || !id) return c.json({ error: 'Tenant required' }, 400);

  const data = await getInvoiceData(id, tenantId);
  if (!data) return c.json({ error: 'Invoice not found' }, 404);

  const pdf = await generateInvoicePdf(data);

  return new Response(pdf as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="invoice-${data.invoiceNo}.pdf"`,
    },
  });
});

app.post('/:id/send', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const tenantId = c.get('tenantId');
  const id = c.req.param('id');
  if (!tenantId || !id) return c.json({ error: 'Tenant required' }, 400);

  const [inv] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
    .limit(1);

  if (!inv) return c.json({ error: 'Invoice not found' }, 404);

  if (!canSendToday(inv)) {
    return c.json({ error: 'Max 2 invoice emails per day. Try again tomorrow.' }, 429);
  }

  const data = await getInvoiceData(inv.id, tenantId);
  if (!data) return c.json({ error: 'Invoice data not found' }, 404);

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
      emailCount: sql`${invoices.emailCount} + 1`,
      lastEmailSentAt: new Date(),
      updatedAt: new Date(),
    } as never)
    .where(eq(invoices.id, inv.id));

  emitToTenant(tenantId, 'dashboard:update', {}).catch(() => {});

  return c.json({ data: { sent: true, emailCount: Number(inv.emailCount) + 1 } });
});

export default app;
