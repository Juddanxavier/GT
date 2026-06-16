import { Hono } from 'hono';
import { eq, and, like, sql } from 'drizzle-orm';
import { db } from '../db';
import { customers } from '../db/schema';
import { requireRole } from '../middleware/authorization';
import { createCustomerSchema, updateCustomerSchema } from '../validators';
import type { AppVariables } from './types';

const app = new Hono<{ Variables: AppVariables }>();

app.get('/', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const search = c.req.query('search');
  const branchId = c.req.query('branchId');

  const conditions = [eq(customers.tenantId, tenantId)];
  if (search) {
    conditions.push(
      sql`(${like(customers.name, `%${search}%`)} OR ${like(customers.email, `%${search}%`)} OR ${like(customers.phone, `%${search}%`)})`,
    );
  }
  if (branchId) {
    conditions.push(eq(customers.branchId, branchId));
  }

  const rows = await db
    .select()
    .from(customers)
    .where(and(...conditions))
    .orderBy(customers.name);

  return c.json({ data: rows });
});

app.post('/', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
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

  return c.json({ data: row }, 201);
});

app.get('/:id', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const [row] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
    .limit(1);

  if (!row) return c.json({ error: 'Customer not found' }, 404);
  return c.json({ data: row });
});

app.patch('/:id', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const body = await c.req.json();
  const parsed = updateCustomerSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fields = Object.entries(flat.fieldErrors).map(([k, v]) => `${k}: ${v?.join(', ')}`).join('; ');
    return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
  }

  const [row] = await db
    .update(customers)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
    .returning();

  if (!row) return c.json({ error: 'Customer not found' }, 404);
  return c.json({ data: row });
});

app.delete('/:id', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const [row] = await db
    .update(customers)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
    .returning();

  if (!row) return c.json({ error: 'Customer not found' }, 404);
  return c.json({ data: row });
});

export default app;
