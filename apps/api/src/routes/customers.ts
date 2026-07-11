import { and, desc, eq, inArray, isNull, like, or, type SQL, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { cacheDel, withCache } from '../cache';
import { db } from '../db';
import { auth } from '../auth';
import { user, invoices as invoicesTable, quotations, quoteItems, shipments, tenants } from '../db/schema';
import { getQueryScope, requireBranchScope, requireRole } from '../middleware/authorization';
import { errorResponse } from '../error-response';
import { registerCustomerSchema, updateProfileSchema, addressSchema } from '../validators';
import type { AppVariables } from './types';

const app = new Hono<{ Variables: AppVariables }>();

// ── Customer-facing: list authenticated user's shipments ──
app.get('/my-shipments', async (c) => {
  const authUser = c.get('user');
  if (!authUser) return c.json({ error: 'Authentication required' }, 401);

  const tenantId = c.get('tenantId') ?? (authUser as Record<string, unknown>).tenantId as string | undefined;
  if (!tenantId) return c.json({ error: 'Tenant not found' }, 400);

  const userEmail = authUser.email;
  const userId = authUser.id;

  // Find shipments where contactEmail matches OR userId matches
  const contactMatch = eq(shipments.contactEmail, userEmail!);
  const userIdMatch = eq(shipments.userId, userId);
  const conditions: (ReturnType<typeof eq | typeof isNull | typeof or>)[] = [
    isNull(shipments.archivedAt),
    eq(shipments.tenantId, tenantId!),
    or(contactMatch, userIdMatch)!,
  ];

  const statusFilter = c.req.query('status');
  if (statusFilter) conditions.push(eq(shipments.status, statusFilter!));

  const search = c.req.query('search');
  if (search && search.length <= 100) {
    conditions.push(sql`${like(shipments.trackingNo, `%${search}%`)}`);
  }

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
  const authUser = c.get('user');
  if (!authUser) return c.json({ error: 'Authentication required' }, 401);

  const tenantId = c.get('tenantId') ?? (authUser as Record<string, unknown>).tenantId as string | undefined;
  if (!tenantId) return c.json({ error: 'Tenant not found' }, 400);

  const userEmail = authUser.email;
  const userId = authUser.id;

  // Build shipment filter using userId directly
  const contactMatch = eq(shipments.contactEmail, userEmail!);
  const userIdMatch = eq(shipments.userId, userId);
  const baseConditions = [
    isNull(shipments.archivedAt),
    eq(shipments.tenantId, tenantId),
    or(contactMatch, userIdMatch),
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

  if (parsed.data.address) {
    try {
      await db
        .update(user)
        .set({ address: parsed.data.address, updatedAt: new Date() })
        .where(eq(user.id, currentUser.id));
    } catch (err) {
      console.error('[profile] address update failed:', err);
      updateErrors.push('Failed to update address');
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
  const authUser = c.get('user') as { id: string; email: string } | null;
  if (!authUser) return c.json({ error: 'Unauthorized' }, 401);
  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ error: 'Tenant not found' }, 400);

  const page = Math.max(parseInt(c.req.query('page') ?? '1', 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') ?? '20', 10) || 20, 1), 50);
  const status = c.req.query('status');
  const conditions: (ReturnType<typeof eq>)[] = [
    eq(quotations.tenantId, tenantId),
    eq(quotations.userId, authUser.id),
  ];
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

  // Find quotation by userId directly
  const [quote] = await db
    .select({ id: quotations.id, status: quotations.status })
    .from(quotations)
    .where(and(eq(quotations.id, id!), eq(quotations.tenantId, tenantId), eq(quotations.userId, currentUser.id)))
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
  const authUser = c.get('user') as { id: string; email: string } | null;
  if (!authUser) return c.json({ error: 'Unauthorized' }, 401);
  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ error: 'Tenant not found' }, 400);
  const { id } = c.req.param();

  const [quote] = await db
    .select()
    .from(quotations)
    .where(and(eq(quotations.id, id!), eq(quotations.tenantId, tenantId), eq(quotations.userId, authUser.id)))
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
  const authUser = c.get('user') as { id: string; email: string } | null;
  if (!authUser) return c.json({ error: 'Unauthorized' }, 401);
  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ error: 'Tenant not found' }, 400);

  const page = Math.max(parseInt(c.req.query('page') ?? '1', 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') ?? '20', 10) || 20, 1), 50);
  const conditions: ReturnType<typeof eq>[] = [eq(invoicesTable.tenantId, tenantId), eq(invoicesTable.userId, authUser.id)];
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
  const authUser = c.get('user') as { id: string; email: string } | null;
  if (!authUser) return c.json({ error: 'Unauthorized' }, 401);
  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ error: 'Tenant not found' }, 400);
  const { id } = c.req.param();

  const [inv] = await db
    .select({
      id: invoicesTable.id, invoiceNo: invoicesTable.invoiceNo, amount: invoicesTable.amount,
      status: invoicesTable.status, notes: invoicesTable.notes, paidAt: invoicesTable.paidAt,
      createdAt: invoicesTable.createdAt, trackingNo: shipments.trackingNo,
      customerEmail: user.email, customerName: user.name,
    })
    .from(invoicesTable)
    .innerJoin(shipments, eq(shipments.id, invoicesTable.shipmentId))
    .leftJoin(user, eq(user.id, invoicesTable.userId))
    .where(and(eq(invoicesTable.id, id!), eq(invoicesTable.tenantId, tenantId), eq(invoicesTable.userId, authUser.id)))
    .limit(1);
  if (!inv) return c.json({ error: 'Not found' }, 404);
  return c.json({ data: inv });
});

app.get('/my-invoices/:id/pdf', async (c) => {
  const authUser = c.get('user') as { id: string; email: string } | null;
  if (!authUser) return c.json({ error: 'Unauthorized' }, 401);
  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ error: 'Tenant not found' }, 400);
  const { id } = c.req.param();

  // Reuse admin invoice data function — it already joins and returns full data
  const { getInvoiceData, generateInvoicePdf } = await import('../invoice/service');
  const data = await getInvoiceData(id, tenantId);
  if (!data) return c.json({ error: 'Not found' }, 404);
  if (data.userId !== authUser.id) return c.json({ error: 'Not found' }, 404);

  const pdf = await generateInvoicePdf(data);
  return new Response(pdf as unknown as BodyInit, {
    status: 200,
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${data.trackingNo}.pdf"` },
  });
});

// ── Admin: inline validation schemas ──

const adminCreateCustomerSchema = z.object({
  name: z.string().min(1).max(255).transform((v) => v.replace(/<[^>]*>/g, '')),
  email: z.string().email().max(255).optional(),
  phone: z.string().regex(/^\+[\d\s-]{4,20}$/, 'Phone must start with + and country code (e.g. +91 9876543210)').max(50).optional().or(z.literal('')),
  address: addressSchema,
  branchId: z.string().uuid().optional(),
});

const adminUpdateCustomerSchema = adminCreateCustomerSchema.partial();

// ── Admin CRUD ──

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

    const conditions: (ReturnType<typeof eq | typeof like> | SQL)[] = [
      eq(user.tenantId, scope.tenantId!),
      eq(user.role, 'customer'),
    ];
    if (scope.branchId) conditions.push(eq(user.branchId, scope.branchId!));
    if (search) {
      conditions.push(
        sql`(${like(user.name, `%${search}%`)} OR ${like(user.email, `%${search}%`)} OR ${like(user.phone, `%${search}%`)})`,
      );
    }
    if (branchId) {
      conditions.push(eq(user.branchId, branchId!));
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
            .from(user)
            .where(and(...conditions) as SQL | undefined);
          const count = countRow?.count ?? 0;
          const offset = (page - 1) * limit;
          const rows = await db
            .select({
              id: user.id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              address: user.address,
              branchId: user.branchId,
              isActive: user.isActive,
              tenantId: user.tenantId,
              role: user.role,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            })
            .from(user)
            .where(and(...conditions) as SQL | undefined)
            .orderBy(user.name)
            .limit(limit)
            .offset(offset);
          return { rows, total: count, page, limit };
        }

        const rows = await db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            address: user.address,
            branchId: user.branchId,
            isActive: user.isActive,
            tenantId: user.tenantId,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          })
          .from(user)
          .where(and(...conditions) as SQL | undefined)
          .orderBy(user.name);
        return { rows };
      },
      hasPagination ? 120 : 600,
    );

    if (hasPagination) {
      const r = result as { rows: unknown[]; total: number; page: number; limit: number };
      return c.json({
        data: r.rows,
        total: r.total,
        page: r.page,
        limit: r.limit,
      });
    }
    return c.json({ data: (result as { rows: unknown[] }).rows });
  },
);

app.post('/', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const body = await c.req.json();
  const parsed = adminCreateCustomerSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fields = Object.entries(flat.fieldErrors)
      .map(([k, v]) => `${k}: ${v?.join(', ')}`)
      .join('; ');
    return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
  }

  // Create user via BA API with role='customer'
  const randomPwd = crypto.randomUUID();
  const created = await (auth.api as any).createUser({
    body: {
      email: parsed.data.email,
      password: randomPwd,
      name: parsed.data.name,
      role: 'customer',
      data: { tenantId, branchId: parsed.data.branchId, phone: parsed.data.phone },
    },
  });

  await cacheDel(tenantId, 'customers:list');
  return c.json({
    data: {
      id: created.user.id,
      name: created.user.name,
      email: created.user.email,
      phone: created.user.phone ?? null,
      address: created.user.address ?? null,
      branchId: created.user.branchId ?? null,
      isActive: created.user.isActive ?? true,
      tenantId: created.user.tenantId ?? null,
      role: 'customer',
      createdAt: created.user.createdAt,
      updatedAt: created.user.updatedAt,
    },
  }, 201);
});

app.get(
  '/:id',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);
    const { id } = c.req.param();

    if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

    const conditions: (ReturnType<typeof eq>)[] = [
      eq(user.id, id!),
      eq(user.tenantId, scope.tenantId!),
      eq(user.role, 'customer'),
    ];
    if (scope.branchId) conditions.push(eq(user.branchId, scope.branchId!));

    const row = await withCache(
      scope.tenantId!,
      `customers:${id}`,
      () =>
        db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            address: user.address,
            branchId: user.branchId,
            isActive: user.isActive,
            tenantId: user.tenantId,
            role: user.role,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          })
          .from(user)
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
  const parsed = adminUpdateCustomerSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fields = Object.entries(flat.fieldErrors)
      .map(([k, v]) => `${k}: ${v?.join(', ')}`)
      .join('; ');
    return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
  }

  const conditions: (ReturnType<typeof eq>)[] = [
    eq(user.id, id!),
    eq(user.tenantId, scope.tenantId!),
    eq(user.role, 'customer'),
  ];
  if (scope.branchId) conditions.push(eq(user.branchId, scope.branchId!));

  // Update profile fields on user table directly
  if (parsed.data.name) {
    await (auth.api as any).updateUser({ body: { userId: id, name: parsed.data.name } });
  }
  if (parsed.data.email) {
    await (auth.api as any).updateUser({ body: { userId: id, email: parsed.data.email } });
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone || null;
  if (parsed.data.branchId !== undefined) updateData.branchId = parsed.data.branchId || null;
  if (parsed.data.address !== undefined) updateData.address = parsed.data.address;

  const [row] = await db
    .update(user)
    .set(updateData)
    .where(and(...conditions) as SQL | undefined)
    .returning({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      branchId: user.branchId,
      isActive: user.isActive,
      tenantId: user.tenantId,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });

  if (!row) return c.json({ error: 'Customer not found' }, 404);

  await cacheDel(scope.tenantId!, 'customers:list');
  await cacheDel(scope.tenantId!, `customers:${id}`);
  return c.json({ data: row });
});

app.delete('/:id', requireRole('superadmin', 'tenant-admin'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const { id } = c.req.param();
  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

  const conditions: (ReturnType<typeof eq>)[] = [
    eq(user.id, id!),
    eq(user.tenantId, scope.tenantId!),
    eq(user.role, 'customer'),
  ];
  if (scope.branchId) conditions.push(eq(user.branchId, scope.branchId!));

  const [row] = await db
    .update(user)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(...conditions) as SQL | undefined)
    .returning({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      branchId: user.branchId,
      isActive: user.isActive,
      tenantId: user.tenantId,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });

  if (!row) return c.json({ error: 'Customer not found' }, 404);

  await cacheDel(scope.tenantId!, 'customers:list');
  await cacheDel(scope.tenantId!, `customers:${id}`);
  return c.json({ data: row });
});

export default app;
