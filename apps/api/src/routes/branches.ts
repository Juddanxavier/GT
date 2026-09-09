import { and, eq, like, or, type SQL, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { cacheDel, cacheDelPattern, withCache } from '../cache';
import { db } from '../db';
import { branches, tenants } from '../db/schema';
import {
  getQueryScope,
  getUser,
  requireBranchScope,
  requireRole,
} from '../middleware/authorization';
import { invalidateBranchCache } from '../middleware/branch';
import { emitToTenant } from '../realtime';
import { logAudit } from '../services/audit';
import { createBranchSchema, updateBranchSchema } from '../validators';
import type { AppVariables } from './types';

const app = new Hono<{ Variables: AppVariables }>();

// Resolve a route param (branch id or slug) to the branch's uuid.
async function resolveBranchId(param: string, tenantId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(and(or(eq(branches.id, param), eq(branches.slug, param)), eq(branches.tenantId, tenantId)))
    .limit(1);
  return row?.id ?? null;
}

// Generate a unique slug within the tenant from a name.
async function uniqueBranchSlug(tenantId: string, base: string): Promise<string> {
  const cleaned = base
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  let candidate = cleaned || 'branch';
  let n = 2;
  // ponytail: linear scan; fine for the handful of branches a tenant has
  while (((await db.select({ id: branches.id })
    .from(branches)
    .where(and(eq(branches.tenantId, tenantId), eq(branches.slug, candidate)))
    .limit(1))[0])) {
    candidate = `${cleaned}-${n++}`;
  }
  return candidate;
}

// ponytail: public branch list for customer onboarding, no auth
app.get('/public', async (c) => {
  const tenantSlug = c.req.query('tenant') || 'gajan-traders';
  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, tenantSlug))
    .limit(1);
  if (!tenant) return c.json({ error: 'Invalid tenant' }, 400);
  const rows = await db
    .select({ id: branches.id, name: branches.name, address: branches.address, phone: branches.phone })
    .from(branches)
    .where(eq(branches.tenantId, tenant.id))
    .orderBy(branches.name);
  return c.json({ data: rows });
});

app.get(
  '/',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const scope = getQueryScope(c);
    const curUser = getUser(c);
    const isSuperAdmin = curUser?.role === 'superadmin';

    const page = Math.max(parseInt(c.req.query('page') ?? '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') ?? '50', 10) || 50, 1), 200);
    const offset = (page - 1) * limit;
    const search = c.req.query('search');
    const hasPagination = c.req.query('page') !== undefined;

    if (search && search.length > 100) return c.json({ error: 'Search query too long' }, 400);

    if (isSuperAdmin) {
      const tenantId = c.get('tenantId');
      if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

      if (!hasPagination) {
        const rows = await withCache(
          tenantId!,
          'branches:list',
          () =>
            db.select().from(branches).where(eq(branches.tenantId, tenantId!)).orderBy(branches.name),
          900,
        );
        return c.json({ data: rows });
      }

      const conditions: ReturnType<typeof eq | typeof like>[] = [eq(branches.tenantId, tenantId!)];
      if (search) {
        const q = `%${search}%`;
        conditions.push(sql`(${like(branches.name, q)} OR ${like(branches.email, q)} OR ${like(branches.address, q)})`);
      }

      const [countRow] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(branches)
        .where(and(...conditions) as SQL | undefined);
      const total = countRow?.count ?? 0;

      const rows = await db
        .select()
        .from(branches)
        .where(and(...conditions) as SQL | undefined)
        .orderBy(branches.name)
        .limit(limit)
        .offset(offset);

      return c.json({ data: rows, total, page, limit });
    }

    const tenantId = c.get('tenantId');
    if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

    const conditions: ReturnType<typeof eq | typeof like>[] = [eq(branches.tenantId, tenantId!)];
    if (curUser?.role === 'staff' && curUser.branchId) {
      conditions.push(eq(branches.id, curUser.branchId!));
    }

    if (!hasPagination && !search) {
      const rows = await withCache(
        tenantId!,
        `branches:list:${curUser?.branchId ?? 'all'}`,
        () =>
          db
            .select()
            .from(branches)
            .where(and(...conditions) as SQL | undefined)
            .orderBy(branches.name),
        900,
      );
      return c.json({ data: rows });
    }

    if (search) {
      const q = `%${search}%`;
      conditions.push(sql`(${like(branches.name, q)} OR ${like(branches.email, q)} OR ${like(branches.address, q)})`);
    }

    const [countRow] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(branches)
      .where(and(...conditions) as SQL | undefined);
    const total = countRow?.count ?? 0;

    const rows = await db
      .select()
      .from(branches)
      .where(and(...conditions) as SQL | undefined)
      .orderBy(branches.name)
      .limit(limit)
      .offset(offset);

    return c.json({ data: rows, total, page, limit });
  },
);

app.post('/', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const curUser = getUser(c);
  const isSuperAdmin = curUser?.role === 'superadmin';
  const contextTenantId = c.get('tenantId');

  const body = await c.req.json();
  const parsed = createBranchSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fields = Object.entries(flat.fieldErrors)
      .map(([k, v]) => `${k}: ${v?.join(', ')}`)
      .join('; ');
    return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
  }

  const tenantId = isSuperAdmin ? (body.tenantId ?? contextTenantId) : contextTenantId;
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const phone = parsed.data.phone;
  if (phone) {
    const [tenant] = await db
      .select({ country: tenants.country })
      .from(tenants)
      .where(eq(tenants.id, tenantId!))
      .limit(1);
    if (tenant?.country) {
      const COUNTRY_DIAL_CODES: Record<string, string> = {
        India: '+91',
        'Sri Lanka': '+94',
      };
      const expectedCode = COUNTRY_DIAL_CODES[tenant.country];
      if (expectedCode && !phone.startsWith(expectedCode)) {
        return c.json(
          { error: `Phone must start with ${expectedCode} for ${tenant.country}` },
          400,
        );
      }
    }
  }

  const rowSlug = parsed.data.slug ?? await uniqueBranchSlug(tenantId!, parsed.data.name);
  const [row] = await db
    .insert(branches)
    .values({ ...parsed.data, slug: rowSlug, tenantId })
    .returning();

  if (!row) return c.json({ error: 'Failed to create branch' }, 500);

  await cacheDel(tenantId!, 'branches:list');
  await cacheDel(tenantId!, 'dashboard:branches');
  await logAudit(
    'BRANCH_CREATED',
    curUser?.id ?? null,
    { branchId: row.id, branchName: row.name, tenantId: tenantId! },
    c,
  );
  emitToTenant(tenantId!, 'dashboard:update', {});
  return c.json({ data: row }, 201);
});

app.get(
  '/:id',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const curUser = getUser(c);
    const { id } = c.req.param();

    const tenantId = c.get('tenantId');
    if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

    const resolvedId = (await resolveBranchId(id!, tenantId)) ?? id!;

    const conditions: ReturnType<typeof eq>[] = [
      eq(branches.id, resolvedId),
      eq(branches.tenantId, tenantId!),
    ];
    if (curUser?.role === 'staff' && curUser.branchId) {
      conditions.push(eq(branches.id, curUser.branchId!));
    }

    const row = await withCache(
      tenantId!,
      `branches:${resolvedId}`,
      () =>
        db
          .select()
          .from(branches)
          .where(and(...conditions) as SQL | undefined)
          .limit(1)
          .then((r) => r[0] ?? null),
      900,
    );

    if (!row) return c.json({ error: 'Branch not found' }, 404);
    return c.json({ data: row });
  },
);

app.patch('/:id', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const resolvedId = await resolveBranchId(id!, tenantId);
  if (!resolvedId) return c.json({ error: 'Branch not found' }, 404);

  const body = await c.req.json();
  const parsed = updateBranchSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fields = Object.entries(flat.fieldErrors)
      .map(([k, v]) => `${k}: ${v?.join(', ')}`)
      .join('; ');
    return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
  }

  const phone = parsed.data.phone;
  if (phone) {
    const [tenant] = await db
      .select({ country: tenants.country })
      .from(tenants)
      .where(eq(tenants.id, tenantId!))
      .limit(1);
    if (tenant?.country) {
      const COUNTRY_DIAL_CODES: Record<string, string> = {
        India: '+91',
        'Sri Lanka': '+94',
      };
      const expectedCode = COUNTRY_DIAL_CODES[tenant.country];
      if (expectedCode && !phone.startsWith(expectedCode)) {
        return c.json(
          { error: `Phone must start with ${expectedCode} for ${tenant.country}` },
          400,
        );
      }
    }
  }

  // If the name changes and no explicit slug is given, keep the existing slug
  // so detail URLs stay stable.
  const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.name && !parsed.data.slug) delete updateData.slug;

  const [row] = await db
    .update(branches)
    .set(updateData)
    .where(and(eq(branches.id, resolvedId), eq(branches.tenantId, tenantId!)) as SQL | undefined)
    .returning();

  if (!row) return c.json({ error: 'Branch not found' }, 404);

  await cacheDelPattern(tenantId!, 'branches:list:*');
  await cacheDel(tenantId!, 'dashboard:branches');
  await cacheDel(tenantId!, `branches:${resolvedId}`);
  await invalidateBranchCache(resolvedId, tenantId!);
  await logAudit(
    'BRANCH_UPDATED',
    getUser(c)?.id ?? null,
    { branchId: resolvedId, changes: parsed.data, tenantId },
    c,
  );
  emitToTenant(tenantId!, 'dashboard:update', {});
  return c.json({ data: row });
});

app.delete('/:id', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const scope = getQueryScope(c);
  const { id } = c.req.param();
  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

  const resolvedId = await resolveBranchId(id!, scope.tenantId);
  if (!resolvedId) return c.json({ error: 'Branch not found' }, 404);

  const [row] = await db
    .delete(branches)
    .where(and(eq(branches.id, resolvedId), eq(branches.tenantId, scope.tenantId!)) as SQL | undefined)
    .returning();

  if (!row) return c.json({ error: 'Branch not found' }, 404);

  await cacheDelPattern(scope.tenantId!, 'branches:list:*');
  await cacheDel(scope.tenantId!, 'dashboard:branches');
  await cacheDel(scope.tenantId!, `branches:${resolvedId}`);
  await invalidateBranchCache(resolvedId, scope.tenantId!);
  await logAudit(
    'BRANCH_DELETED',
    getUser(c)?.id ?? null,
    { branchId: resolvedId, branchName: row.name, tenantId: scope.tenantId! },
    c,
  );
  await emitToTenant(scope.tenantId!, 'dashboard:update', {});
  return c.json({ data: row });
});

export default app;
