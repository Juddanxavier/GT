/** @format */

import { Hono } from 'hono';
import { eq, or } from 'drizzle-orm';
import { db } from '../db';
import { tenants } from '../db/schema';
import { getUser } from '../middleware/authorization';
import type { AppVariables } from './types';

const app = new Hono<{ Variables: AppVariables }>();

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

export default app;
