import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { branches, tenants } from '../db/schema';
import { requireRole, requireBranchScope, getUser, getQueryScope } from '../middleware/authorization';
import { invalidateBranchCache } from '../middleware/branch';
import { withCache, cacheDel } from '../cache';
import { createBranchSchema, updateBranchSchema } from '../validators';
import type { AppVariables } from './types';

const app = new Hono<{ Variables: AppVariables }>();

app.get('/', requireRole('superadmin', 'tenant-admin', 'staff'), requireBranchScope(), async (c) => {
  const curUser = getUser(c);
  const isSuperAdmin = curUser?.role === 'superadmin';

  if (isSuperAdmin) {
    const tenantId = c.get('tenantId');
    if (!tenantId) return c.json({ error: 'Tenant required' }, 400);
    const rows = await withCache(tenantId, 'branches:list', () =>
      db.select().from(branches).where(eq(branches.tenantId, tenantId)).orderBy(branches.name),
      900,
    );
    return c.json({ data: rows });
  }

  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const conditions = [eq(branches.tenantId, tenantId)];
  if (curUser?.role === 'staff' && curUser.branchId) {
    conditions.push(eq(branches.id, curUser.branchId));
  }

  const rows = await withCache(tenantId, `branches:list:${curUser?.branchId ?? 'all'}`, () =>
    db
      .select()
      .from(branches)
      .where(and(...conditions))
      .orderBy(branches.name),
    900,
  );

  return c.json({ data: rows });
});

app.post('/', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const curUser = getUser(c);
  const isSuperAdmin = curUser?.role === 'superadmin';
  const contextTenantId = c.get('tenantId');

  const body = await c.req.json();
  const parsed = createBranchSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fields = Object.entries(flat.fieldErrors).map(([k, v]) => `${k}: ${v?.join(', ')}`).join('; ');
    return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
  }

  const tenantId = isSuperAdmin ? (body.tenantId ?? contextTenantId) : contextTenantId;
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const phone = parsed.data.phone;
  if (phone) {
    const [tenant] = await db.select({ country: tenants.country }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (tenant?.country) {
      const COUNTRY_DIAL_CODES: Record<string, string> = {
        'India': '+91',
        'Sri Lanka': '+94',
      };
      const expectedCode = COUNTRY_DIAL_CODES[tenant.country];
      if (expectedCode && !phone.startsWith(expectedCode)) {
        return c.json({ error: `Phone must start with ${expectedCode} for ${tenant.country}` }, 400);
      }
    }
  }

  const [row] = await db
    .insert(branches)
    .values({ ...parsed.data, tenantId })
    .returning();

  await cacheDel(tenantId, 'branches:list');
  await cacheDel(tenantId, 'dashboard:branches');
  return c.json({ data: row }, 201);
});

app.get('/:id', requireRole('superadmin', 'tenant-admin', 'staff'), requireBranchScope(), async (c) => {
  const curUser = getUser(c);
  const { id } = c.req.param();

  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const conditions: ReturnType<typeof eq>[] = [eq(branches.id, id), eq(branches.tenantId, tenantId)];
  if (curUser?.role === 'staff' && curUser.branchId) {
    conditions.push(eq(branches.id, curUser.branchId));
  }

  const [row] = await withCache(tenantId, `branches:${id}`, () =>
    db
      .select()
      .from(branches)
      .where(and(...conditions))
      .limit(1)
      .then((r) => r[0] ?? null),
    900,
  );

  if (!row) return c.json({ error: 'Branch not found' }, 404);
  return c.json({ data: row });
});

app.patch('/:id', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const body = await c.req.json();
  const parsed = updateBranchSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fields = Object.entries(flat.fieldErrors).map(([k, v]) => `${k}: ${v?.join(', ')}`).join('; ');
    return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
  }

  const phone = parsed.data.phone;
  if (phone) {
    const [tenant] = await db.select({ country: tenants.country }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    if (tenant?.country) {
      const COUNTRY_DIAL_CODES: Record<string, string> = {
        'India': '+91',
        'Sri Lanka': '+94',
      };
      const expectedCode = COUNTRY_DIAL_CODES[tenant.country];
      if (expectedCode && !phone.startsWith(expectedCode)) {
        return c.json({ error: `Phone must start with ${expectedCode} for ${tenant.country}` }, 400);
      }
    }
  }

  const [row] = await db
    .update(branches)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(branches.id, id), eq(branches.tenantId, tenantId)))
    .returning();

  if (!row) return c.json({ error: 'Branch not found' }, 404);

  await cacheDel(tenantId, 'branches:list');
  await cacheDel(tenantId, 'dashboard:branches');
  await cacheDel(tenantId, `branches:${id}`);
  await invalidateBranchCache(id, tenantId);
  return c.json({ data: row });
});

app.delete('/:id', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const scope = getQueryScope(c);
  const { id } = c.req.param();
  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

  const [row] = await db
    .delete(branches)
    .where(and(eq(branches.id, id), eq(branches.tenantId, scope.tenantId)))
    .returning();

  if (!row) return c.json({ error: 'Branch not found' }, 404);

  await cacheDel(scope.tenantId, 'branches:list');
  await cacheDel(scope.tenantId, 'dashboard:branches');
  await cacheDel(scope.tenantId, `branches:${id}`);
  await invalidateBranchCache(id, scope.tenantId);
  return c.json({ data: row });
});

export default app;
