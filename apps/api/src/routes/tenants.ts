/** @format */

import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { tenants } from '../db/schema';
import { requireRole } from '../middleware/authorization';
import type { AppVariables } from './types';

const app = new Hono<{ Variables: AppVariables }>();

app.get('/', requireRole('superadmin'), async (c) => {
  const rows = await db.select().from(tenants).orderBy(tenants.name);
  return c.json({ data: rows });
});

export default app;
