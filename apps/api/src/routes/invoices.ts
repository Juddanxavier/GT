import { and, desc, eq, like, type SQL, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { cacheDel, cacheDelPattern, withCache } from '../cache';
import { db } from '../db';
import { user, invoices, shipments, tenants } from '../db/schema';
import {
  canSendToday,
  generateInvoicePdf,
  getInvoiceByShipmentId,
  getInvoiceData,
} from '../invoice/service';
import { errorResponse } from '../error-response';
import { getQueryScope, requireBranchScope, requireRole } from '../middleware/authorization';
import { updateInvoiceSchema } from '../validators';
import { emailQueue } from '../queues';
import { emitToTenant } from '../realtime';
import { logAudit } from '../services/audit';
import { resolveShipmentId } from '../services/shipment-resolve';
import type { AppVariables } from './types';

const app = new Hono<{ Variables: AppVariables }>();

// Resolve a route param (invoice uuid or invoice number) to the invoice's uuid.
export async function resolveInvoiceId(param: string, tenantId: string): Promise<string | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(param);
  const [row] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(
      and(
        isUuid ? eq(invoices.id, param) : eq(invoices.invoiceNo, param),
        eq(invoices.tenantId, tenantId),
      ),
    )
    .limit(1);
  return row?.id ?? null;
}

// Must be before /:id routes to avoid 'shipment' matching as :id
app.get(
  '/shipment/:shipmentId',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);
    const shipmentParam = c.req.param('shipmentId');
    if (!shipmentParam) return c.json({ error: 'Invalid request' }, 400);

    if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

    const shipmentId = await resolveShipmentId(shipmentParam, scope);
    if (!shipmentId) return c.json({ error: 'Shipment not found' }, 404);

    const data = await withCache(
      scope.tenantId,
      `invoices:shipment:${shipmentId}`,
      () => getInvoiceByShipmentId(shipmentId, scope.tenantId!),
      120,
    );
    return c.json({ data: data ?? null });
  },
);

app.post(
  '/shipment/:shipmentId',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    try {
      const scope = getQueryScope(c);
      const shipmentParam = c.req.param('shipmentId');
      if (!scope.tenantId || !shipmentParam) return c.json({ error: 'Invalid request' }, 400);

      const shipmentId = await resolveShipmentId(shipmentParam, scope);
      if (!shipmentId) return c.json({ error: 'Shipment not found' }, 404);

      const [existing] = await db
        .select({ id: invoices.id })
        .from(invoices)
        .where(and(eq(invoices.shipmentId, shipmentId), eq(invoices.tenantId, scope.tenantId)))
        .limit(1);

      if (existing) {
        await cacheDel(scope.tenantId!, `invoices:shipment:${shipmentId}`);
        return c.json({ error: 'Invoice already exists for this shipment' }, 409);
      }

      const [ship] = await db
        .select()
        .from(shipments)
        .where(and(eq(shipments.id, shipmentId), eq(shipments.tenantId, scope.tenantId)))
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
        userId: ship.userId ?? null,
        branchId: ship.branchId ?? null,
        invoiceNo,
        amount: String(amount),
        status: 'paid' as const,
        emailCount: 0,
        paidAt: now,
        lastEmailSentAt: now,
      };

      const [inv] = await db.insert(invoices).values(invoiceValues).returning();

      if (!inv) return c.json({ error: 'Failed to create invoice' }, 500);

      await cacheDel(scope.tenantId!, `invoices:shipment:${shipmentId}`);
      await cacheDelPattern(scope.tenantId, 'invoices:list:*');
      logAudit(
        'INVOICE_CREATED',
        c.get('user')?.id ?? null,
        {
          invoiceId: inv.id,
          invoiceNo,
          shipmentId,
          amount,
          tenantId: scope.tenantId,
        },
        c,
      );
      emitToTenant(scope.tenantId, 'dashboard:update', {});
      return c.json({ data: inv }, 201);
    } catch (err) {
      c.get('logger').error({ err }, 'invoice create failed');
      return c.json({ error: 'Internal server error' }, 500);
    }
  },
);

app.get(
  '/',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);

    const search = c.req.query('search');
    const page = Math.max(1, Number(c.req.query('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(c.req.query('limit')) || 50));
    const offset = (page - 1) * limit;

    if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

    const status = c.req.query('status');
    const userId = c.req.query('userId');

    const conditions: ReturnType<typeof eq>[] = [eq(invoices.tenantId, scope.tenantId)];
    if (scope.branchId) conditions.push(eq(shipments.branchId, scope.branchId));
    if (search) conditions.push(sql`${like(invoices.invoiceNo, `%${search}%`)}`);
    if (status) conditions.push(eq(invoices.status, status!));
    if (userId) conditions.push(eq(invoices.userId, userId!));

    const cacheKey = `invoices:list:${scope.branchId ?? 'all'}:${search ?? ''}:${status ?? ''}:${userId ?? 'all'}:${page}:${limit}`;
    const result = await withCache(
      scope.tenantId,
      cacheKey,
      async () => {
        const [countRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(invoices)
          .innerJoin(shipments, eq(shipments.id, invoices.shipmentId))
          .where(and(...conditions) as SQL | undefined);
        const count = countRow?.count ?? 0;

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
            customerId: invoices.userId,
            customerName: user.name,
          })
          .from(invoices)
          .innerJoin(shipments, eq(shipments.id, invoices.shipmentId))
          .leftJoin(user, eq(user.id, invoices.userId))
          .where(and(...conditions) as SQL | undefined)
          .orderBy(desc(invoices.createdAt))
          .limit(limit)
          .offset(offset);

        // Compute status counts from ALL matching records (ignoring status filter)
          const countConditions: SQL[] = [eq(invoices.tenantId, scope.tenantId!)];
          if (scope.branchId) countConditions.push(eq(shipments.branchId, scope.branchId));
          if (userId) countConditions.push(eq(invoices.userId, userId!));
          // search filter is intentionally excluded from counts

          const countRows = await db
            .select({
              status: invoices.status,
              count: sql<number>`count(*)::int`,
            })
            .from(invoices)
            .innerJoin(shipments, eq(shipments.id, invoices.shipmentId))
            .where(and(...countConditions) as SQL | undefined)
            .groupBy(invoices.status);

        const counts: Record<string, number> = {};
        for (const r of countRows) {
          counts[r.status!] = r.count;
        }

        return { rows, total: Number(count), page, limit, counts };
      },
      120,
    );

    return c.json({
      data: result.rows,
      total: result.total,
      page: result.page,
      limit: result.limit,
      counts: result.counts,
    });
  },
);

app.get(
  '/trend',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);
    if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

    const conditions: SQL[] = [eq(invoices.tenantId, scope.tenantId)];
    if (scope.branchId) conditions.push(eq(shipments.branchId, scope.branchId));

    const rows = await db
      .select({
        date: sql<string>`DATE(${invoices.createdAt})::text`,
        total: sql<number>`COUNT(*)::int`,
        paid: sql<number>`COUNT(*) FILTER (WHERE ${invoices.status} = 'paid')::int`,
        unpaid: sql<number>`COUNT(*) FILTER (WHERE ${invoices.status} = 'unpaid')::int`,
      })
      .from(invoices)
      .innerJoin(shipments, eq(shipments.id, invoices.shipmentId))
      .where(and(...conditions) as SQL | undefined)
      .groupBy(sql`DATE(${invoices.createdAt})`)
      .orderBy(sql`DATE(${invoices.createdAt})`);
    return c.json({ data: rows });
  },
);

app.get(
  '/:id',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);
    const id = c.req.param('id');
    if (!scope.tenantId || !id) return c.json({ error: 'Tenant required' }, 400);

    const resolvedId = (await resolveInvoiceId(id, scope.tenantId)) ?? id;

    const data = await withCache(
      scope.tenantId!,
      `invoices:${resolvedId}`,
      () => getInvoiceData(resolvedId, scope.tenantId!),
      120,
    );
    if (!data) return c.json({ error: 'Invoice not found' }, 404);

    // Staff can only view invoices for their branch
    if (scope.branchId && data.shipmentBranchId && data.shipmentBranchId !== scope.branchId) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    return c.json({ data });
  },
);

app.get(
  '/:id/pdf',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);
    const id = c.req.param('id');
    if (!scope.tenantId || !id) return c.json({ error: 'Tenant required' }, 400);

    const resolvedId = (await resolveInvoiceId(id, scope.tenantId)) ?? id;

    const data = await withCache(
      scope.tenantId!,
      `invoices:${resolvedId}:data`,
      () => getInvoiceData(resolvedId, scope.tenantId!),
      120,
    );
    if (!data) return c.json({ error: 'Invoice not found' }, 404);

    if (scope.branchId && data.shipmentBranchId && data.shipmentBranchId !== scope.branchId) {
      return c.json({ error: 'Invoice not found' }, 404);
    }

    const pdf = await generateInvoicePdf(data);

    return new Response(pdf as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${data.trackingNo}.pdf"`,
      },
    });
  },
);

app.post(
  '/:id/send',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);
    const id = c.req.param('id');
    if (!scope.tenantId || !id) return c.json({ error: 'Tenant required' }, 400);

    const resolvedId = await resolveInvoiceId(id, scope.tenantId);
    if (!resolvedId) return c.json({ error: 'Invoice not found' }, 404);

    const [inv] = await db
      .select({
        id: invoices.id,
        emailCount: invoices.emailCount,
        lastEmailSentAt: invoices.lastEmailSentAt,
        shipmentId: invoices.shipmentId,
        userId: invoices.userId,
      })
      .from(invoices)
      .where(and(eq(invoices.id, resolvedId), eq(invoices.tenantId, scope.tenantId)) as SQL | undefined)
      .limit(1);

    if (!inv) return c.json({ error: 'Invoice not found' }, 404);

    if (!canSendToday(inv)) {
      return c.json({ error: 'Max 2 invoice emails per day. Try again tomorrow.' }, 429);
    }

    if (!inv.userId)
      return c.json(
        {
          error:
            'Cannot send — no user assigned to this invoice. Assign a user to the shipment first.',
        },
        400,
      );

    const [cust] = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, inv.userId))
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

    await cacheDel(scope.tenantId!, `invoices:${resolvedId}`);
    await cacheDel(scope.tenantId!, `invoices:${resolvedId}:data`);
    logAudit(
      'INVOICE_SENT',
      c.get('user')?.id ?? null,
      {
        invoiceId: resolvedId,
        userId: inv.userId,
        email: cust.email,
        tenantId: scope.tenantId,
      },
      c,
    );
    emitToTenant(scope.tenantId, 'dashboard:update', {});

    return c.json({ data: { sent: true, emailCount: Number(inv.emailCount) + 1 } });
  },
);

app.patch('/:id', requireRole('superadmin', 'tenant-admin'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const id = c.req.param('id');
  if (!scope.tenantId || !id) return errorResponse(c, 'TENANT_REQUIRED', 'Tenant required', 400);

  const resolvedId = await resolveInvoiceId(id, scope.tenantId);
  if (!resolvedId) return errorResponse(c, 'NOT_FOUND', 'Invoice not found', 404);

  const parsed = updateInvoiceSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join(', '), 400);
  const filtered = parsed.data! as Record<string, unknown>;
  if (Object.keys(filtered).length === 0)
    return errorResponse(c, 'NO_FIELDS', 'No valid fields to update', 400);

  const [existing] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, resolvedId), eq(invoices.tenantId, scope.tenantId)))
    .limit(1);
  if (!existing) return c.json({ error: 'Invoice not found' }, 404);

  const [row] = await db
    .update(invoices)
    .set({ ...filtered, updatedAt: new Date() })
    .where(and(eq(invoices.id, resolvedId), eq(invoices.tenantId, scope.tenantId)))
    .returning();

  await cacheDel(scope.tenantId!, `invoices:${resolvedId}`);
  await cacheDel(scope.tenantId!, `invoices:${resolvedId}:data`);
  await cacheDelPattern(scope.tenantId, 'invoices:list:*');

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(filtered)) {
    const oldVal = (existing as Record<string, unknown>)[key];
    const newVal = filtered[key];
    if (String(oldVal) !== String(newVal)) changes[key] = { from: oldVal, to: newVal };
  }
  if (Object.keys(changes).length > 0) {
    logAudit(
      'INVOICE_UPDATED',
      c.get('user')?.id ?? null,
      {
        invoiceId: resolvedId,
        invoiceNo: existing.invoiceNo,
        changes,
        tenantId: scope.tenantId,
      },
      c,
    );
  }

  emitToTenant(scope.tenantId, 'dashboard:update', {});
  return c.json({ data: row });
});

app.delete('/:id', requireRole('superadmin', 'tenant-admin'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const id = c.req.param('id');
  if (!scope.tenantId || !id) return c.json({ error: 'Tenant required' }, 400);

  const resolvedId = await resolveInvoiceId(id, scope.tenantId);
  if (!resolvedId) return c.json({ error: 'Invoice not found' }, 404);

  const [existing] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, resolvedId), eq(invoices.tenantId, scope.tenantId)))
    .limit(1);
  if (!existing) return c.json({ error: 'Invoice not found' }, 404);

  await db.delete(invoices).where(and(eq(invoices.id, resolvedId), eq(invoices.tenantId, scope.tenantId)));

  await cacheDel(scope.tenantId!, `invoices:${resolvedId}`);
  await cacheDel(scope.tenantId!, `invoices:${resolvedId}:data`);
  await cacheDelPattern(scope.tenantId, 'invoices:list:*');
  logAudit(
    'INVOICE_DELETED',
    c.get('user')?.id ?? null,
    {
      invoiceId: resolvedId,
      invoiceNo: existing.invoiceNo,
      tenantId: scope.tenantId,
    },
    c,
  );
  emitToTenant(scope.tenantId, 'dashboard:update', {});

  return c.json({ data: { success: true } });
});

export default app;
