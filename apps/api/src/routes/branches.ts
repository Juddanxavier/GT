import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { branches } from '../db/schema';
import { requireRole, getUser } from '../middleware/authorization';
import { createBranchSchema, updateBranchSchema } from '../validators';
import type { AppVariables } from './types';

const app = new Hono<{ Variables: AppVariables }>();

app.get('/', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const user = getUser(c);
  const isSuperAdmin = user?.role === 'superadmin';

  if (isSuperAdmin) {
    const rows = await db.select().from(branches).orderBy(branches.name);
    return c.json({ data: rows });
  }

  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const rows = await db
    .select()
    .from(branches)
    .where(eq(branches.tenantId, tenantId))
    .orderBy(branches.name);

  return c.json({ data: rows });
});

app.post('/', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const tenantId = c.get('tenantId');
  if (!tenantId) return c.json({ error: 'Tenant required' }, 400);

  const body = await c.req.json();
  const parsed = createBranchSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const fields = Object.entries(flat.fieldErrors).map(([k, v]) => `${k}: ${v?.join(', ')}`).join('; ');
    return c.json({ error: fields || flat.formErrors.join(', ') || 'Validation failed' }, 400);
  }

  const [row] = await db
    .insert(branches)
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
    .from(branches)
    .where(and(eq(branches.id, id), eq(branches.tenantId, tenantId)))
    .limit(1);

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

  const [row] = await db
    .update(branches)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(branches.id, id), eq(branches.tenantId, tenantId)))
    .returning();

  if (!row) return c.json({ error: 'Branch not found' }, 404);
  return c.json({ data: row });
});

export default app;
