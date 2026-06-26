import { Hono } from 'hono';
import { eq, and, like, sql } from 'drizzle-orm';
import { db } from '../db';
import { customers } from '../db/schema';
import { requireRole, requireBranchScope, getQueryScope } from '../middleware/authorization';
import { withCache, cacheDel } from '../cache';
import { createCustomerSchema, updateCustomerSchema } from '../validators';
import type { AppVariables } from './types';

const app = new Hono<{ Variables: AppVariables }>();

app.get('/', requireRole('superadmin', 'tenant-admin', 'staff'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);

  const search = c.req.query('search');
  const branchId = c.req.query('branchId');

  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

  const conditions: ReturnType<typeof eq>[] = [eq(customers.tenantId, scope.tenantId)];
  if (scope.branchId) conditions.push(eq(customers.branchId, scope.branchId));
  if (search) {
    conditions.push(
      sql`(${like(customers.name, `%${search}%`)} OR ${like(customers.email, `%${search}%`)} OR ${like(customers.phone, `%${search}%`)})`,
    );
  }
  if (branchId) {
    conditions.push(eq(customers.branchId, branchId));
  }

  const rows = await withCache(scope.tenantId!, 'customers:list', () =>
    db
      .select()
      .from(customers)
      .where(and(...conditions))
      .orderBy(customers.name),
    600,
  );

  return c.json({ data: rows });
});

app.post('/', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const body = await c.req.json();
  const parsed = createCustomerSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fields = Object.entries(flat.fieldErrors).map(([k, v]) => `${k}: ${v?.join(', ')}`).join('; ');
    return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
  }

  const [row] = await db
    .insert(customers)
    .values({ ...parsed.data, tenantId })
    .returning();

  await cacheDel(tenantId, 'customers:list');
  return c.json({ data: row }, 201);
});

app.get('/:id', requireRole('superadmin', 'tenant-admin', 'staff'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const { id } = c.req.param();

  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

  const conditions: ReturnType<typeof eq>[] = [eq(customers.id, id), eq(customers.tenantId, scope.tenantId)];
  if (scope.branchId) conditions.push(eq(customers.branchId, scope.branchId));

  const row = await withCache(scope.tenantId!, `customers:${id}`, () =>
    db
      .select()
      .from(customers)
      .where(and(...conditions))
      .limit(1)
      .then((r) => r[0] ?? null),
    600,
  );

  if (!row) return c.json({ error: 'Customer not found' }, 404);
  return c.json({ data: row });
});

app.patch('/:id', requireRole('superadmin', 'tenant-admin'), requireBranchScope(), async (c) => {
  const scope = getQueryScope(c);
  const { id } = c.req.param();
  if (!scope.tenantId) return c.json({ error: 'Tenant required' }, 400);

  const body = await c.req.json();
  const parsed = updateCustomerSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fields = Object.entries(flat.fieldErrors).map(([k, v]) => `${k}: ${v?.join(', ')}`).join('; ');
    return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
  }

  const conditions: ReturnType<typeof eq>[] = [eq(customers.id, id), eq(customers.tenantId, scope.tenantId)];
  if (scope.branchId) conditions.push(eq(customers.branchId, scope.branchId));

  const [row] = await db
    .update(customers)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(...conditions))
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

  const conditions: ReturnType<typeof eq>[] = [eq(customers.id, id), eq(customers.tenantId, scope.tenantId)];
  if (scope.branchId) conditions.push(eq(customers.branchId, scope.branchId));

  const [row] = await db
    .update(customers)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(...conditions))
    .returning();

  if (!row) return c.json({ error: 'Customer not found' }, 404);

  await cacheDel(scope.tenantId!, 'customers:list');
  await cacheDel(scope.tenantId!, `customers:${id}`);
  return c.json({ data: row });
});

export default app;
