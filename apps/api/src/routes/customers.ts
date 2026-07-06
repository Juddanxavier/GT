import { and, desc, eq, inArray, isNull, like, or, type SQL, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { cacheDel, withCache } from '../cache';
import { db } from '../db';
import { auth } from '../auth';
import { customers, invoices as invoicesTable, quotations, quoteItems, shipments, tenants, user } from '../db/schema';
import { getQueryScope, requireBranchScope, requireRole } from '../middleware/authorization';
import { errorResponse } from '../error-response';
import { createCustomerSchema, updateCustomerSchema, registerCustomerSchema, updateProfileSchema } from '../validators';
import type { AppVariables } from './types';

const app = new Hono<{ Variables: AppVariables }>();

// ── Customer-facing: list authenticated user's shipments ──
app.get('/my-shipments', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const tenantId = c.get('tenantId') ?? (user as Record<string, unknown>).tenantId as string | undefined;
  if (!tenantId) return c.json({ error: 'Tenant not found' }, 400);

  const userEmail = user.email;

  // Try to find a customer record with this email
  const [customerRecord] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.tenantId, tenantId), eq(customers.email, userEmail!)))
    .limit(1);

  // Find shipments where contactEmail matches OR customerId matches
  const contactMatch = eq(shipments.contactEmail, userEmail!);
  const conditions: (ReturnType<typeof eq | typeof isNull | typeof or>)[] = [
    isNull(shipments.archivedAt),
    eq(shipments.tenantId, tenantId!),
    customerRecord
      ? or(contactMatch, eq(shipments.customerId, customerRecord.id))!
      : contactMatch,
  ];

  const statusFilter = c.req.query('status');
  if (statusFilter) conditions.push(eq(shipments.status, statusFilter!));

  const page = Math.max(parseInt(c.req.query('page') ?? '1', 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') ?? '20', 10) || 20, 1), 50);
  const offset = (page - 1) * limit;

  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(shipments)
    .where(and(...conditions) as SQL | undefined);
  const total = countRow?.count ?? 0;

  const rows = await db
    .select({
      id: shipments.id,
      trackingNo: shipments.trackingNo,
      status: shipments.status,
      carrier: shipments.carrier,
      origin: shipments.origin,
      destination: shipments.destination,
      estimatedDelivery: shipments.estimatedDelivery,
      actualDelivery: shipments.actualDelivery,
      lastTrackedAt: shipments.lastTrackedAt,
      labelCode: shipments.labelCode,
      createdAt: shipments.createdAt,
    })
    .from(shipments)
    .where(and(...conditions) as SQL | undefined)
    .orderBy(desc(shipments.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({
    data: rows,
    total,
    page,
    limit,
  });
});

// ── Customer-facing: dashboard KPIs, recent shipments, alerts ──
app.get('/my-dashboard', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const tenantId = c.get('tenantId') ?? (user as Record<string, unknown>).tenantId as string | undefined;
  if (!tenantId) return c.json({ error: 'Tenant not found' }, 400);

  const userEmail = user.email;

  // Find customer record by email match
  const [customerRecord] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.tenantId, tenantId), eq(customers.email, userEmail!)))
    .limit(1);

  // Build shipment filter (same dual lookup as /my-shipments)
  const contactMatch = eq(shipments.contactEmail, userEmail!);
  const customerIdMatch = customerRecord ? eq(shipments.customerId, customerRecord.id) : null;
  const baseConditions = [
    isNull(shipments.archivedAt),
    eq(shipments.tenantId, tenantId),
    customerIdMatch ? or(contactMatch, customerIdMatch) : contactMatch,
  ] as SQL[];

  // KPI counts — 5 parallel queries
  const [totalRow, inTransitRow, deliveredRow, exceptionRow, pendingRow] = await Promise.all([
    db.select({ count: sql<number>`COUNT(*)::int` }).from(shipments).where(and(...baseConditions) as SQL | undefined),
    db.select({ count: sql<number>`COUNT(*)::int` }).from(shipments).where(and(...baseConditions, eq(shipments.status, 'in_transit')) as SQL | undefined),
    db.select({ count: sql<number>`COUNT(*)::int` }).from(shipments).where(and(...baseConditions, eq(shipments.status, 'delivered')) as SQL | undefined),
    db.select({ count: sql<number>`COUNT(*)::int` }).from(shipments).where(and(...baseConditions, inArray(shipments.status, ['exception', 'delivery_failure'])) as SQL | undefined),
    db.select({ count: sql<number>`COUNT(*)::int` }).from(shipments).where(and(...baseConditions, eq(shipments.status, 'pending')) as SQL | undefined),
  ]);

  // Recent shipments
  const recent = await db
    .select({
      id: shipments.id,
      trackingNo: shipments.trackingNo,
      status: shipments.status,
      carrier: shipments.carrier,
      origin: shipments.origin,
      destination: shipments.destination,
      createdAt: shipments.createdAt,
    })
    .from(shipments)
    .where(and(...baseConditions) as SQL | undefined)
    .orderBy(desc(shipments.createdAt))
    .limit(5);

  // Alerts — exception or delivery_failure
  const alerts = await db
    .select({
      trackingNo: shipments.trackingNo,
      status: shipments.status,
    })
    .from(shipments)
    .where(and(...baseConditions, inArray(shipments.status, ['exception', 'delivery_failure'])) as SQL | undefined)
    .orderBy(desc(shipments.createdAt))
    .limit(5)
    .then((rows) =>
      rows.map((r) => ({
        trackingNo: r.trackingNo,
        status: r.status,
        message: r.status === 'exception' ? 'Exception reported' : 'Delivery failed',
      })),
    );

  return c.json({
    kpis: {
      total: totalRow[0]?.count ?? 0,
      inTransit: inTransitRow[0]?.count ?? 0,
      delivered: deliveredRow[0]?.count ?? 0,
      exception: exceptionRow[0]?.count ?? 0,
      pending: pendingRow[0]?.count ?? 0,
    },
    recent,
    alerts,
  });
});

// ── Customer self-registration (no auth required — uses tenant slug from header) ──

app.post('/register', async (c) => {
  const parsed = registerCustomerSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join(', '), 400);
  const { email, password, name } = parsed.data!;

  const tenantSlug = c.req.header('x-tenant-slug') || c.req.header('x-tenant') || 'gajan-traders';

  // Resolve tenant slug to tenant ID
  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, tenantSlug))
    .limit(1);
  if (!tenant) return c.json({ error: 'Invalid tenant' }, 400);

  // Check for existing user with same email
  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (existing) {
    return c.json({ error: 'An account with this email already exists' }, 409);
  }

  try {
    // Create user via BetterAuth server API
    const created = await (auth.api as any).createUser({
      body: {
        email,
        password,
        name,
        role: 'customer',
        data: { tenantId: tenant.id },
      },
    });

    if (!created || !created.user) {
      return c.json({ error: 'Failed to create account' }, 500);
    }

    // Sign the user in to create a session and get Set-Cookie headers
    const signInRes = await auth.api.signInEmail({
      body: { email, password },
      headers: c.req.raw.headers,
      asResponse: true,
    });

    if (!signInRes.ok) {
      return c.json({ error: 'Account created but sign-in failed. Please log in.' }, 500);
    }

    // Forward BetterAuth's response directly to preserve Set-Cookie headers
    return c.newResponse(signInRes.body, 200, Object.fromEntries(signInRes.headers.entries()));
  } catch (err) {
    const baErr = err as { status?: number; message?: string };
    console.error('[customers] register error:', err);
    return c.json(
      { error: baErr.message || 'Registration failed. Please try again.' },
      (baErr.status ?? 500) as 400 | 409 | 500,
    );
  }
});

// ── Customer profile update (name, password) ──
app.patch('/profile', async (c) => {
  const currentUser = c.get('user') as { id: string; email: string } | null;
  if (!currentUser) return errorResponse(c, 'UNAUTHORIZED', 'Unauthorized', 401);

  const parsed = updateProfileSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join(', '), 400);
  const { name, currentPassword, newPassword } = parsed.data!;
  let updateErrors: string[] = [];

  if (name) {
    try {
      await (auth.api as any).updateUser({
        body: { userId: currentUser.id, name },
      });
    } catch (err: any) {
      console.error('[profile] name update failed:', err);
      updateErrors.push(err?.message || 'Failed to update name');
    }
  }

  if (currentPassword && newPassword) {
    try {
      await auth.api.changePassword({
        body: { currentPassword, newPassword },
        headers: c.req.raw.headers,
      });
    } catch (err: any) {
      const msg = (err as { message?: string; status?: number }).message || '';
      console.error('[profile] password change failed:', err);
      if (msg.includes('Invalid password') || msg.includes('incorrect')) {
        updateErrors.push('Current password is incorrect');
      } else if (msg.includes('same')) {
        updateErrors.push('New password must be different from current');
      } else {
        updateErrors.push('Failed to change password');
      }
    }
  }

  if (updateErrors.length > 0) {
    return c.json({ error: updateErrors.join('. ') }, 400);
  }

  const updated = await auth.api.getSession({ headers: c.req.raw.headers });
  return c.json({ data: { id: updated?.user?.id, name: updated?.user?.name, email: updated?.user?.email } });
});

// ── Customer-facing: my quotations ──
app.get('/my-quotations', async (c) => {
  const user = c.get('user') as { id: string; email: string } | null;
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ error: 'Tenant not found' }, 400);
  const [customerRecord] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.tenantId, tenantId), eq(customers.email, user.email!)))
    .limit(1);
  if (!customerRecord) return c.json({ data: [], total: 0 });
  const page = Math.max(parseInt(c.req.query('page') ?? '1', 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') ?? '20', 10) || 20, 1), 50);
  const status = c.req.query('status');
  const conditions = [eq(quotations.tenantId, tenantId), eq(quotations.customerId, customerRecord.id)];
  if (status) conditions.push(eq(quotations.status, status));
  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(quotations)
    .where(and(...conditions) as SQL | undefined);
  const total = countRow?.count ?? 0;
  const rows = await db
    .select({ id: quotations.id, quoteNo: quotations.quoteNo, status: quotations.status, total: quotations.total, validUntil: quotations.validUntil, notes: quotations.notes, createdAt: quotations.createdAt })
    .from(quotations)
    .where(and(...conditions) as SQL | undefined)
    .orderBy(desc(quotations.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
  return c.json({ data: rows, total, page, limit });
});

app.patch('/my-quotations/:id/status', async (c) => {
  const currentUser = c.get('user') as { id: string; email: string } | null;
  if (!currentUser) return c.json({ error: 'Unauthorized' }, 401);
  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ error: 'Tenant not found' }, 400);
  const { id } = c.req.param();
  const { status: newStatus } = await c.req.json();

  // Validate status transition
  if (!['accepted', 'rejected'].includes(newStatus)) {
    return c.json({ error: 'Invalid status. Only accepted or rejected allowed.' }, 400);
  }

  // Find customer record
  const [customerRecord] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.tenantId, tenantId), eq(customers.email, currentUser.email!)))
    .limit(1);
  if (!customerRecord) return c.json({ error: 'Not found' }, 404);

  // Find quotation
  const [quote] = await db
    .select({ id: quotations.id, status: quotations.status })
    .from(quotations)
    .where(and(eq(quotations.id, id!), eq(quotations.tenantId, tenantId), eq(quotations.customerId, customerRecord.id)))
    .limit(1);
  if (!quote) return c.json({ error: 'Quotation not found' }, 404);

  // Only allow accepting/rejecting from 'sent' status
  if (quote.status !== 'sent') {
    return c.json({ error: 'Can only accept or reject a quotation that has been sent.' }, 400);
  }

  await db
    .update(quotations)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(quotations.id, id!));

  return c.json({ data: { id, status: newStatus } });
});

app.get('/my-quotations/:id', async (c) => {
  const user = c.get('user') as { id: string; email: string } | null;
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ error: 'Tenant not found' }, 400);
  const { id } = c.req.param();
  const [customerRecord] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.tenantId, tenantId), eq(customers.email, user.email!)))
    .limit(1);
  if (!customerRecord) return c.json({ error: 'Not found' }, 404);
  const [quote] = await db
    .select()
    .from(quotations)
    .where(and(eq(quotations.id, id!), eq(quotations.tenantId, tenantId), eq(quotations.customerId, customerRecord.id)))
    .limit(1);
  if (!quote) return c.json({ error: 'Not found' }, 404);
  const items = await db
    .select()
    .from(quoteItems)
    .where(eq(quoteItems.quotationId, id!))
    .orderBy(quoteItems.createdAt);
  return c.json({ data: { ...quote, items } });
});

// ── Customer-facing: my invoices ──
app.get('/my-invoices', async (c) => {
  const user = c.get('user') as { id: string; email: string } | null;
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ error: 'Tenant not found' }, 400);
  const [customerRecord] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.tenantId, tenantId), eq(customers.email, user.email!)))
    .limit(1);
  if (!customerRecord) return c.json({ data: [], total: 0 });
  const page = Math.max(parseInt(c.req.query('page') ?? '1', 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') ?? '20', 10) || 20, 1), 50);
  const conditions = [eq(invoicesTable.tenantId, tenantId), eq(invoicesTable.customerId, customerRecord.id)];
  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(invoicesTable)
    .where(and(...conditions) as SQL | undefined);
  const total = countRow?.count ?? 0;
  const rows = await db
    .select({
      id: invoicesTable.id, invoiceNo: invoicesTable.invoiceNo, amount: invoicesTable.amount,
      status: invoicesTable.status, paidAt: invoicesTable.paidAt, createdAt: invoicesTable.createdAt,
      trackingNo: shipments.trackingNo,
    })
    .from(invoicesTable)
    .innerJoin(shipments, eq(shipments.id, invoicesTable.shipmentId))
    .where(and(...conditions) as SQL | undefined)
    .orderBy(desc(invoicesTable.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
  return c.json({ data: rows, total, page, limit });
});

app.get('/my-invoices/:id', async (c) => {
  const user = c.get('user') as { id: string; email: string } | null;
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ error: 'Tenant not found' }, 400);
  const { id } = c.req.param();
  const [customerRecord] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.tenantId, tenantId), eq(customers.email, user.email!)))
    .limit(1);
  if (!customerRecord) return c.json({ error: 'Not found' }, 404);
  const [inv] = await db
    .select({
      id: invoicesTable.id, invoiceNo: invoicesTable.invoiceNo, amount: invoicesTable.amount,
      status: invoicesTable.status, notes: invoicesTable.notes, paidAt: invoicesTable.paidAt,
      createdAt: invoicesTable.createdAt, trackingNo: shipments.trackingNo,
      customerEmail: customers.email, customerName: customers.name,
    })
    .from(invoicesTable)
    .innerJoin(shipments, eq(shipments.id, invoicesTable.shipmentId))
    .leftJoin(customers, eq(customers.id, invoicesTable.customerId))
    .where(and(eq(invoicesTable.id, id!), eq(invoicesTable.tenantId, tenantId), eq(invoicesTable.customerId, customerRecord.id)))
    .limit(1);
  if (!inv) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: inv });
});

app.get('/my-invoices/:id/pdf', async (c) => {
  const user = c.get('user') as { id: string; email: string } | null;
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ error: 'Tenant not found' }, 400);
  const { id } = c.req.param();
  const [customerRecord] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.tenantId, tenantId), eq(customers.email, user.email!)))
    .limit(1);
  if (!customerRecord) return c.json({ error: 'Not found' }, 404);

  // Reuse admin invoice data function — it already joins and returns full data
  const { getInvoiceData, generateInvoicePdf } = await import('../invoice/service');
  const data = await getInvoiceData(id, tenantId);
  if (!data) return c.json({ error: 'Not found' }, 404);
  if (data.customerId !== customerRecord.id) return c.json({ error: 'Not found' }, 404);

  const pdf = await generateInvoicePdf(data);
  return new Response(pdf as unknown as BodyInit, {
    status: 200,
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="invoice-${data.invoiceNo}.pdf"` },
  });
});

app.get(
  '/',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);

    const search = c.req.query('search');
    const branchId = c.req.query('branchId');
    const page = Math.max(1, parseInt(c.req.query('page') ?? '', 10) || 0);
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') ?? '', 10) || 50));
    const hasPagination = page > 0;

    if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

    const conditions: ReturnType<typeof eq>[] = [eq(customers.tenantId, scope.tenantId!)];
    if (scope.branchId) conditions.push(eq(customers.branchId, scope.branchId!));
    if (search) {
      conditions.push(
        sql`(${like(customers.name, `%${search}%`)} OR ${like(customers.email, `%${search}%`)} OR ${like(customers.phone, `%${search}%`)})`,
      );
    }
    if (branchId) {
      conditions.push(eq(customers.branchId, branchId!));
    }

    const cacheKey = hasPagination
      ? `customers:list:${scope.branchId ?? 'all'}:${search ?? ''}:${branchId ?? ''}:${page}:${limit}`
      : 'customers:list';

    const result = await withCache(
      scope.tenantId!,
      cacheKey,
      async () => {
        if (hasPagination) {
          const [countRow] = await db
            .select({ count: sql<number>`COUNT(*)::int` })
            .from(customers)
            .where(and(...conditions) as SQL | undefined);
          const count = countRow?.count ?? 0;
          const offset = (page - 1) * limit;
          const rows = await db
            .select()
            .from(customers)
            .where(and(...conditions) as SQL | undefined)
            .orderBy(customers.name)
            .limit(limit)
            .offset(offset);
          return { rows, total: count, page, limit };
        }

        const rows = await db
          .select()
          .from(customers)
          .where(and(...conditions) as SQL | undefined)
          .orderBy(customers.name);
        return { rows };
      },
      hasPagination ? 120 : 600,
    );

    if (hasPagination) {
      return c.json({
        data: (result as { rows: typeof customers.$inferSelect[]; total: number; page: number; limit: number }).rows,
        total: (result as { total: number }).total,
        page: (result as { page: number }).page,
        limit: (result as { limit: number }).limit,
      });
    }
    return c.json({ data: (result as { rows: typeof customers.$inferSelect[] }).rows });
  },
);

app.post('/', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const body = await c.req.json();
  const parsed = createCustomerSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fields = Object.entries(flat.fieldErrors)
      .map(([k, v]) => `${k}: ${v?.join(', ')}`)
      .join('; ');
    return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
  }

  const [row] = await db
    .insert(customers)
    .values({ ...parsed.data, tenantId })
    .returning();

  await cacheDel(tenantId, 'customers:list');
  return c.json({ data: row }, 201);
});

app.get(
  '/:id',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);
    const { id } = c.req.param();

    if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

    const conditions: ReturnType<typeof eq>[] = [
      eq(customers.id, id!),
      eq(customers.tenantId, scope.tenantId!),
    ];
    if (scope.branchId) conditions.push(eq(customers.branchId, scope.branchId!));

    const row = await withCache(
      scope.tenantId!,
      `customers:${id}`,
      () =>
        db
          .select()
          .from(customers)
          .where(and(...conditions) as SQL | undefined)
          .limit(1)
          .then((r) => r[0] ?? null),
      600,
    );

    if (!row) return c.json({ error: 'Customer not found' }, 404);
    return c.json({ data: row });
  },
);

app.patch('/:id', requireRole('superadmin', 'tenant-admin'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const { id } = c.req.param();
  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

  const body = await c.req.json();
  const parsed = updateCustomerSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fields = Object.entries(flat.fieldErrors)
      .map(([k, v]) => `${k}: ${v?.join(', ')}`)
      .join('; ');
    return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
  }

  const conditions: ReturnType<typeof eq>[] = [
    eq(customers.id, id!),
    eq(customers.tenantId, scope.tenantId!),
  ];
  if (scope.branchId) conditions.push(eq(customers.branchId, scope.branchId!));

  const [row] = await db
    .update(customers)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(...conditions) as SQL | undefined)
    .returning();

  if (!row) return c.json({ error: 'Customer not found' }, 404);

  await cacheDel(scope.tenantId!, 'customers:list');
  await cacheDel(scope.tenantId!, `customers:${id}`);
  return c.json({ data: row });
});

app.delete('/:id', requireRole('superadmin', 'tenant-admin'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const { id } = c.req.param();
  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

  const conditions: ReturnType<typeof eq>[] = [
    eq(customers.id, id!),
    eq(customers.tenantId, scope.tenantId!),
  ];
  if (scope.branchId) conditions.push(eq(customers.branchId, scope.branchId!));

  const [row] = await db
    .update(customers)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(...conditions) as SQL | undefined)
    .returning();

  if (!row) return c.json({ error: 'Customer not found' }, 404);

  await cacheDel(scope.tenantId!, 'customers:list');
  await cacheDel(scope.tenantId!, `customers:${id}`);
  return c.json({ data: row });
});

export default app;
