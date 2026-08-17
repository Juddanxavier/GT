/** @format */

import { eq, or } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db';
import { tenants } from '../db/schema';
import { errorResponse } from '../error-response';
import { getUser } from '../middleware/authorization';
import type { AppVariables } from './types';

const app = new Hono<{ Variables: AppVariables }>();

const updateTenantSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  country: z.string().trim().max(100).nullable().optional(),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/i)
    .optional(),
});

app.get('/', async (c) => {
  const user = getUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  if (user.role === 'superadmin') {
    const rows = await db.select().from(tenants).orderBy(tenants.name);
    return c.json({ data: rows });
  }

  if (!user.tenantId) return c.json({ error: 'No tenant assigned' }, 400);
  const [row] = await db.select().from(tenants).where(eq(tenants.id, user.tenantId)).limit(1);
  return c.json({ data: row ? [row] : [] });
});

app.patch('/:id', async (c) => {
  const user = getUser(c);
  if (!user) return c.json({ error: 'Authentication required' }, 401);

  const id = c.req.param('id');
  if (!id) return c.json({ error: 'Invalid tenant id' }, 400);

  if (user.role !== 'superadmin' && user.role !== 'tenant-admin') {
    return errorResponse(c, 'FORBIDDEN', 'Forbidden: insufficient permissions', 403);
  }

  if (user.role === 'tenant-admin' && user.tenantId !== id) {
    return errorResponse(c, 'FORBIDDEN', 'Forbidden: you can only edit your own organization', 403);
  }

  const [existing] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.id, id))
    .limit(1);
  if (!existing) return errorResponse(c, 'NOT_FOUND', 'Tenant not found', 404);

  const body = await c.req.json().catch(() => ({}));
  const parsed = updateTenantSchema.safeParse(body);
  if (!parsed.success) return errorResponse(c, 'VALIDATION_ERROR', 'Invalid fields', 400);

  const [updated] = await db
    .update(tenants)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(tenants.id, id))
    .returning();

  return c.json({ data: updated });
});

export default app;
