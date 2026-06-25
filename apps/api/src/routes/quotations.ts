import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { quotations, quoteItems, shipments } from '../db/schema';
import { requireRole, requireAbility, requireBranchScope, getQueryScope } from '../middleware/authorization';
import {
  createQuotationSchema,
  updateQuotationSchema,
  updateQuotationStatusSchema,
} from '../validators';
import type { AppVariables } from './types';

const app = new Hono<{ Variables: AppVariables }>();

app.get('/', requireRole('superadmin', 'tenant-admin', 'staff'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);

  const status = c.req.query('status');
  const customerId = c.req.query('customerId');

  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

  const conditions: ReturnType<typeof eq>[] = [eq(quotations.tenantId, scope.tenantId)];
  if (scope.branchId) conditions.push(eq(quotations.branchId, scope.branchId));
  if (status) conditions.push(eq(quotations.status, status));
  if (customerId) conditions.push(eq(quotations.customerId, customerId));

  const rows = await db
    .select()
    .from(quotations)
    .where(and(...conditions))
    .orderBy(desc(quotations.createdAt));

  return c.json({ data: rows });
});

app.get('/:id', requireRole('superadmin', 'tenant-admin', 'staff'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const { id } = c.req.param();

  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

  const conditions: ReturnType<typeof eq>[] = [eq(quotations.id, id), eq(quotations.tenantId, scope.tenantId)];
  if (scope.branchId) conditions.push(eq(quotations.branchId, scope.branchId));

  const [quote] = await db
    .select()
    .from(quotations)
    .where(and(...conditions))
    .limit(1);

  if (!quote) return c.json({ error: 'Quotation not found' }, 404);

  const items = await db
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quotationId, id))
    .orderBy(quoteItems.createdAt);

  return c.json({ data: { ...quote, items } });
});

app.post('/', requireRole('superadmin', 'tenant-admin', 'staff'), requireBranchScope(), async (c) => {
  const user = c.get('user') as { id: string; role: string; tenantId?: string; branchId?: string } | null;
  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const body = await c.req.json();
  const parsed = createQuotationSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fields = Object.entries(flat.fieldErrors).map(([k, v]) => `${k}: ${v?.join(', ')}`).join('; ');
    return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
  }

  const { items, ...quoteData } = parsed.data;
  const bodyBranchId = quoteData.branchId;
  const overrideBranchId = c.get('branchId');

  // Branch scope enforcement on creation
  if (user?.role === 'staff') {
    const allowedBranchId = user.branchId;
    if (!allowedBranchId) return c.json({ error: 'No branch assigned to your account' }, 403);
    if (bodyBranchId && bodyBranchId !== allowedBranchId) {
      return c.json({ error: 'You can only create quotations in your assigned branch' }, 403);
    }
    quoteData.branchId = allowedBranchId;
  } else if (user?.role === 'tenant-admin' && overrideBranchId) {
    if (bodyBranchId && bodyBranchId !== overrideBranchId) {
      return c.json({ error: 'Branch override mismatch: quotation branch does not match selected branch filter' }, 403);
    }
    quoteData.branchId = overrideBranchId;
  }

  const total = items.reduce((sum, item) => sum + item.amount, 0);

  const [quote] = await db
    .insert(quotations)
    .values({ ...quoteData, total, tenantId })
    .returning();

  if (items.length > 0) {
    await db.insert(quoteItems).values(
      items.map((item) => ({ ...item, quotationId: quote.id })),
    );
  }

  return c.json({ data: { ...quote, items } }, 201);
});

app.patch('/:id', requireRole('superadmin', 'tenant-admin', 'staff'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const { id } = c.req.param();
  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

  const body = await c.req.json();
  const parsed = updateQuotationSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fields = Object.entries(flat.fieldErrors).map(([k, v]) => `${k}: ${v?.join(', ')}`).join('; ');
    return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
  }

  const { items, ...quoteData } = parsed.data;

  const updateData: Record<string, unknown> = { ...quoteData, updatedAt: new Date() };

  if (items) {
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    updateData.total = total;
  }

  const updateConditions: ReturnType<typeof eq>[] = [eq(quotations.id, id), eq(quotations.tenantId, scope.tenantId)];
  if (scope.branchId) updateConditions.push(eq(quotations.branchId, scope.branchId));

  const [quote] = await db
    .update(quotations)
    .set(updateData)
    .where(and(...updateConditions))
    .returning();

  if (!quote) return c.json({ error: 'Quotation not found' }, 404);

  if (items) {
    await db.delete(quoteItems).where(eq(quoteItems.quotationId, id));
    await db.insert(quoteItems).values(
      items.map((item) => ({ ...item, quotationId: id })),
    );
  }

  const updatedItems = await db
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quotationId, id));

  return c.json({ data: { ...quote, items: updatedItems } });
});

app.patch('/:id/status', requireRole('superadmin', 'tenant-admin', 'staff'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const { id } = c.req.param();
  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

  const body = await c.req.json();
  const parsed = updateQuotationStatusSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fields = Object.entries(flat.fieldErrors).map(([k, v]) => `${k}: ${v?.join(', ')}`).join('; ');
    return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
  }

  const updateConditions: ReturnType<typeof eq>[] = [eq(quotations.id, id), eq(quotations.tenantId, scope.tenantId)];
  if (scope.branchId) updateConditions.push(eq(quotations.branchId, scope.branchId));

  const [quote] = await db
    .update(quotations)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(and(...updateConditions))
    .returning();

  if (!quote) return c.json({ error: 'Quotation not found' }, 404);
  return c.json({ data: quote });
});

app.post('/:id/convert', requireRole('superadmin', 'tenant-admin', 'staff'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const { id } = c.req.param();
  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

  const findConditions: ReturnType<typeof eq>[] = [eq(quotations.id, id), eq(quotations.tenantId, scope.tenantId)];
  if (scope.branchId) findConditions.push(eq(quotations.branchId, scope.branchId));

  const [quote] = await db
    .select()
    .from(quotations)
    .where(and(...findConditions))
    .limit(1);

  if (!quote) return c.json({ error: 'Quotation not found' }, 404);
  if (quote.status !== 'accepted') {
    return c.json({ error: 'Only accepted quotations can be converted to shipments' }, 400);
  }

  const body = await c.req.json().catch(() => ({}));
  const trackingNo = body.trackingNo;
  if (!trackingNo) return c.json({ error: 'trackingNo is required' }, 400);

  const [shipment] = await db
    .insert(shipments)
    .values({
      trackingNo,
      customerId: quote.customerId,
      status: 'pending',
      origin: quote.notes || undefined,
      branchId: quote.branchId,
      tenantId: scope.tenantId,
      payload: { convertedFromQuote: quote.id, quoteNo: quote.quoteNo },
    })
    .returning();

  await db
    .update(quotations)
    .set({ status: 'converted', updatedAt: new Date() })
    .where(eq(quotations.id, id));

  return c.json({ data: { quotation: { ...quote, status: 'converted' }, shipment } }, 201);
});

export default app;
