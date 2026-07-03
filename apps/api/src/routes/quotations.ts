import { and, desc, eq, like, or, type SQL, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { cacheDel, cacheDelPattern, withCache } from '../cache';
import { db } from '../db';
import { notifications, quotations, quoteItems, shipments, user as userTable } from '../db/schema';
import {
  getQueryScope,
  getUser,
  requireBranchScope,
  requireRole,
} from '../middleware/authorization';
import { emitToTenant } from '../realtime';
import { logAudit } from '../services/audit';
import {
  createQuotationSchema,
  updateQuotationSchema,
  updateQuotationStatusSchema,
} from '../validators';
import type { AppVariables } from './types';

const app = new Hono<{ Variables: AppVariables }>();

app.get(
  '/trend',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);
    if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);
    const conditions = [eq(quotations.tenantId, scope.tenantId!)];
    if (scope.branchId) conditions.push(eq(quotations.branchId, scope.branchId!));
    const rows = await db
      .select({
        date: sql<string>`DATE(${quotations.createdAt})::text`,
        total: sql<number>`COUNT(*)::int`,
        draft: sql<number>`COUNT(*) FILTER (WHERE ${quotations.status} = 'draft')::int`,
        sent: sql<number>`COUNT(*) FILTER (WHERE ${quotations.status} = 'sent')::int`,
        accepted: sql<number>`COUNT(*) FILTER (WHERE ${quotations.status} = 'accepted')::int`,
        rejected: sql<number>`COUNT(*) FILTER (WHERE ${quotations.status} = 'rejected')::int`,
        converted: sql<number>`COUNT(*) FILTER (WHERE ${quotations.status} = 'converted')::int`,
      })
      .from(quotations)
      .where(and(...conditions) as SQL | undefined)
      .groupBy(sql`DATE(${quotations.createdAt})`)
      .orderBy(sql`DATE(${quotations.createdAt})`);
    return c.json({ data: rows });
  },
);

app.get(
  '/',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);

    const status = c.req.query('status');
    const customerId = c.req.query('customerId');
    const search = c.req.query('search');
    const page = Math.max(1, parseInt(c.req.query('page') ?? '', 10) || 0);
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') ?? '', 10) || 50));
    const hasPagination = page > 0;

    if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

    const conditions: (ReturnType<typeof eq> | ReturnType<typeof like> | SQL)[] = [eq(quotations.tenantId, scope.tenantId!)];
    if (scope.branchId) conditions.push(eq(quotations.branchId, scope.branchId!));
    if (status) conditions.push(eq(quotations.status, status!));
    if (customerId) conditions.push(eq(quotations.customerId, customerId!));
    if (search) conditions.push(like(quotations.quoteNo, `%${search}%`));

    const cacheKey = hasPagination
      ? `quotations:list:${scope.branchId ?? 'all'}:${status ?? 'all'}:${customerId ?? 'all'}:${page}:${limit}`
      : `quotations:list:${scope.branchId ?? 'all'}:${status ?? 'all'}:${customerId ?? 'all'}`;

    const result = await withCache(
      scope.tenantId!,
      cacheKey,
      async () => {
        if (hasPagination) {
          const [countRow] = await db
            .select({ count: sql<number>`COUNT(*)::int` })
            .from(quotations)
            .where(and(...conditions) as SQL | undefined);
          const count = countRow?.count ?? 0;
          const offset = (page - 1) * limit;
          const rows = await db
            .select()
            .from(quotations)
            .where(and(...conditions) as SQL | undefined)
            .orderBy(desc(quotations.createdAt))
            .limit(limit)
            .offset(offset);

          // Compute status counts from ALL matching records (ignoring status/customerId filter)
          const countConditions: ReturnType<typeof eq>[] = [eq(quotations.tenantId, scope.tenantId!)];
          if (scope.branchId) countConditions.push(eq(quotations.branchId, scope.branchId!));

          const countRows = await db
            .select({
              status: quotations.status,
              count: sql<number>`COUNT(*)::int`,
            })
            .from(quotations)
            .where(and(...countConditions) as SQL | undefined)
            .groupBy(quotations.status);

          const counts: Record<string, number> = {};
          for (const r of countRows) {
            counts[r.status!] = r.count;
          }

          return { rows, total: count, page, limit, counts };
        }

        const rows = await db
          .select()
          .from(quotations)
          .where(and(...conditions) as SQL | undefined)
          .orderBy(desc(quotations.createdAt));
        return { rows };
      },
      hasPagination ? 120 : 120,
    );

    if (hasPagination) {
      const r = result as {
        rows: typeof quotations.$inferSelect[];
        total: number;
        page: number;
        limit: number;
        counts?: Record<string, number>;
      };
      return c.json({
        data: r.rows,
        total: r.total,
        page: r.page,
        limit: r.limit,
        counts: r.counts,
      });
    }
    return c.json({ data: (result as { rows: typeof quotations.$inferSelect[] }).rows });
  },
);

app.get(
  '/:id',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);
    const { id } = c.req.param();

    if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

    const conditions: ReturnType<typeof eq>[] = [
      eq(quotations.id, id!),
      eq(quotations.tenantId, scope.tenantId!),
    ];
    if (scope.branchId) conditions.push(eq(quotations.branchId, scope.branchId!));

    const quote = await withCache(
      scope.tenantId!,
      `quotations:${id}`,
      async () => {
        const [q] = await db
          .select()
          .from(quotations)
          .where(and(...conditions) as SQL | undefined)
          .limit(1);

        if (!q) return null;

        const items = await db
          .select()
          .from(quoteItems)
          .where(eq(quoteItems.quotationId, id!))
          .orderBy(quoteItems.createdAt);

        return { ...q, items };
      },
      120,
    );

    if (!quote) return c.json({ error: 'Quotation not found' }, 404);
    return c.json({ data: quote });
  },
);

app.post(
  '/',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const user = c.get('user') as unknown as {
      id: string;
      role: string;
      tenantId?: string;
      branchId?: string;
    } | null;
    const tenantId = c.get('tenantId');
    if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

    const body = await c.req.json();
    const parsed = createQuotationSchema.safeParse(body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const fields = Object.entries(flat.fieldErrors)
        .map(([k, v]) => `${k}: ${v?.join(', ')}`)
        .join('; ');
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
        return c.json(
          {
            error:
              'Branch override mismatch: quotation branch does not match selected branch filter',
          },
          403,
        );
      }
      quoteData.branchId = overrideBranchId;
    }

    const total = items.reduce((sum, item) => sum + item.amount, 0);

    const [quote] = await db
      .insert(quotations)
      .values({
        ...quoteData,
        total: String(total),
        tenantId,
        validUntil: quoteData.validUntil ? new Date(quoteData.validUntil) : undefined,
      })
      .returning();

    if (!quote) return c.json({ error: 'Failed to create quotation' }, 500);

    if (items.length > 0) {
      await db.insert(quoteItems).values(
        items.map((item) => ({
          ...item,
          quantity: String(item.quantity),
          rate: String(item.rate),
          amount: String(item.amount),
          quotationId: quote.id,
        })),
      );
    }

    // Notify tenant admins + branch staff
    const notifyUsers = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(
        and(
          eq(userTable.tenantId, tenantId!),
          or(
            eq(userTable.role, 'tenant-admin'),
            and(eq(userTable.role, 'staff'), eq(userTable.branchId, quote.branchId!)) as
              | SQL
              | undefined,
          ),
        ) as SQL | undefined,
      );

    if (notifyUsers.length > 0) {
      const notificationRows = notifyUsers.map((u) => ({
        tenantId: tenantId!,
        userId: u.id,
        quotationId: quote.id,
        type: 'quotation_created',
        title: 'New Quotation',
        message: `Quote ${quote.quoteNo} created by ${((user as Record<string, unknown>)?.name as string) ?? 'Unknown'}`,
        link: `/quotations/${quote.id}`,
      }));
      await db.insert(notifications).values(notificationRows);
      emitToTenant(tenantId!, 'notification:new', { count: notifyUsers.length });
    }

    await cacheDelPattern(tenantId!, 'quotations:list:*');
    await logAudit(
      'QUOTATION_CREATED',
      user?.id ?? null,
      { quotationId: quote.id, quoteNo: quote.quoteNo, tenantId },
      c,
    );
    emitToTenant(tenantId!, 'dashboard:update', {});
    return c.json({ data: { ...quote, items } }, 201);
  },
);

app.patch(
  '/:id',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);
    const { id } = c.req.param();
    if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

    const body = await c.req.json();
    const parsed = updateQuotationSchema.safeParse(body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const fields = Object.entries(flat.fieldErrors)
        .map(([k, v]) => `${k}: ${v?.join(', ')}`)
        .join('; ');
      return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
    }

    const { items, ...quoteData } = parsed.data;

    const updateData: Record<string, unknown> = { ...quoteData, updatedAt: new Date() };

    if (items) {
      const total = items.reduce((sum, item) => sum + item.amount, 0);
      updateData.total = total;
    }

    const updateConditions: ReturnType<typeof eq>[] = [
      eq(quotations.id, id!),
      eq(quotations.tenantId, scope.tenantId!),
    ];
    if (scope.branchId) updateConditions.push(eq(quotations.branchId, scope.branchId!));

    const [quote] = await db
      .update(quotations)
      .set(updateData)
      .where(and(...updateConditions) as SQL | undefined)
      .returning();

    if (!quote) return c.json({ error: 'Quotation not found' }, 404);

    if (items) {
      await db.delete(quoteItems).where(eq(quoteItems.quotationId, id!));
      await db.insert(quoteItems).values(
        items.map((item) => ({
          ...item,
          quantity: String(item.quantity),
          rate: String(item.rate),
          amount: String(item.amount),
          quotationId: id,
        })),
      );
    }

    const updatedItems = await db.select().from(quoteItems).where(eq(quoteItems.quotationId, id!));

    await cacheDelPattern(scope.tenantId!, 'quotations:list:*');
    await cacheDel(scope.tenantId!, `quotations:${id}`);
    await logAudit(
      'QUOTATION_UPDATED',
      getUser(c)?.id ?? null,
      { quotationId: id, changes: parsed.data, tenantId: scope.tenantId },
      c,
    );
    emitToTenant(scope.tenantId!, 'dashboard:update', {});
    return c.json({ data: { ...quote, items: updatedItems } });
  },
);

app.patch(
  '/:id/status',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);
    const { id } = c.req.param();
    if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

    const body = await c.req.json();
    const parsed = updateQuotationStatusSchema.safeParse(body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const fields = Object.entries(flat.fieldErrors)
        .map(([k, v]) => `${k}: ${v?.join(', ')}`)
        .join('; ');
      return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
    }

    const updateConditions: ReturnType<typeof eq>[] = [
      eq(quotations.id, id!),
      eq(quotations.tenantId, scope.tenantId!),
    ];
    if (scope.branchId) updateConditions.push(eq(quotations.branchId, scope.branchId!));

    const [quote] = await db
      .update(quotations)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(and(...updateConditions) as SQL | undefined)
      .returning();

    if (!quote) return c.json({ error: 'Quotation not found' }, 404);
    await cacheDelPattern(scope.tenantId!, 'quotations:list:*');
    await cacheDel(scope.tenantId!, `quotations:${id}`);
    await logAudit(
      'QUOTATION_UPDATED',
      getUser(c)?.id ?? null,
      { quotationId: id, changes: { status: parsed.data.status }, tenantId: scope.tenantId },
      c,
    );
    emitToTenant(scope.tenantId!, 'dashboard:update', {});
    return c.json({ data: quote });
  },
);

app.post(
  '/:id/convert',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);
    const { id } = c.req.param();
    if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

    const findConditions: ReturnType<typeof eq>[] = [
      eq(quotations.id, id!),
      eq(quotations.tenantId, scope.tenantId!),
    ];
    if (scope.branchId) findConditions.push(eq(quotations.branchId, scope.branchId!));

    const [quote] = await db
      .select()
      .from(quotations)
      .where(and(...findConditions) as SQL | undefined)
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

    if (!shipment) return c.json({ error: 'Failed to create shipment' }, 500);

    await db
      .update(quotations)
      .set({ status: 'converted', updatedAt: new Date() })
      .where(eq(quotations.id, id!));

    await cacheDelPattern(scope.tenantId!, 'quotations:list:*');
    await cacheDel(scope.tenantId!, `quotations:${id}`);
    await logAudit(
      'QUOTATION_CONVERTED',
      getUser(c)?.id ?? null,
      {
        quotationId: id,
        quoteNo: quote.quoteNo,
        shipmentId: shipment.id,
        trackingNo,
        tenantId: scope.tenantId,
      },
      c,
    );
    emitToTenant(scope.tenantId!, 'dashboard:update', {});
    return c.json({ data: { quotation: { ...quote, status: 'converted' }, shipment } }, 201);
  },
);

app.delete(
  '/:id',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);
    const { id } = c.req.param();
    if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

    const conditions: ReturnType<typeof eq>[] = [
      eq(quotations.id, id!),
      eq(quotations.tenantId, scope.tenantId!),
    ];
    if (scope.branchId) conditions.push(eq(quotations.branchId, scope.branchId!));

    const [quote] = await db
      .delete(quotations)
      .where(and(...conditions) as SQL | undefined)
      .returning();
    if (!quote) return c.json({ error: 'Quotation not found' }, 404);

    await cacheDelPattern(scope.tenantId!, 'quotations:list:*');
    await cacheDel(scope.tenantId!, `quotations:${id}`);
    await logAudit(
      'QUOTATION_DELETED',
      getUser(c)?.id ?? null,
      { quotationId: id, quoteNo: quote.quoteNo, tenantId: scope.tenantId },
      c,
    );
    emitToTenant(scope.tenantId!, 'dashboard:update', {});
    return c.json({ data: quote });
  },
);

export default app;
