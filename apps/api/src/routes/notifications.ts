/** @format */

import { and, desc, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { cacheDelPattern } from '../cache';
import { db } from '../db';
import { notifications } from '../db/schema';
import { type AuthVariables, sessionMiddleware } from '../middleware/auth';
import { type TenantVariables, tenantMiddleware } from '../middleware/tenant';
import { emitToTenant } from '../realtime';
import { logAudit } from '../services/audit';

type Env = { Variables: AuthVariables & TenantVariables };

const app = new Hono<Env>();

app.use('*', sessionMiddleware, tenantMiddleware);

  // List notifications for current user/tenant
app.get('/', async (c) => {
  const user = c.get('user') as unknown as { id: string; role: string; tenantId?: string } | null;
  const tenantId = c.get('tenantId');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  // Superadmins without tenant scope see no notifications
  if (!tenantId) return c.json({ data: [], total: 0, limit: 0, offset: 0 });

  const limit = Math.min(Number(c.req.query('limit')) || 20, 50);
  const offset = Number(c.req.query('offset')) || 0;
  const onlyUnread = c.req.query('unread') === 'true';

  const conditions = [eq(notifications.tenantId, tenantId), eq(notifications.userId, user.id)];
  if (onlyUnread) conditions.push(eq(notifications.read, false));

  const rows = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);

  const count = onlyUnread
    ? rows.length
    : await db
        .select({ total: notifications.id })
        .from(notifications)
        .where(and(eq(notifications.tenantId, tenantId), eq(notifications.userId, user.id)))
        .then((r) => r.length);

  return c.json({ data: rows, total: count, limit, offset });
});

// Unread count
app.get('/unread-count', async (c) => {
  const user = c.get('user') as unknown as { id: string; role: string; tenantId?: string } | null;
  const tenantId = c.get('tenantId');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (!tenantId) return c.json({ count: 0 });

  const [row] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.tenantId, tenantId),
        eq(notifications.userId, user.id),
        eq(notifications.read, false),
      ),
    );

  return c.json({ count: Number(row?.count ?? 0) });
});

// Mark single notification as read
app.patch('/:id/read', async (c) => {
  const user = c.get('user') as unknown as { id: string; role: string; tenantId?: string } | null;
  const tenantId = c.get('tenantId');
  if (!user || !tenantId) return c.json({ error: 'Unauthorized' }, 401);

  const { id } = c.req.param();
  const [updated] = await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.tenantId, tenantId),
        eq(notifications.userId, user.id),
      ),
    )
    .returning();

  if (!updated) return c.json({ error: 'Notification not found' }, 404);

  await logAudit('NOTIFICATION_READ', user.id, {
    notificationId: id,
    type: updated.type,
    title: updated.title,
  }, c);

  return c.json({ data: updated });
});

// Mark all as read
app.patch('/read-all', async (c) => {
  const user = c.get('user') as unknown as { id: string; role: string; tenantId?: string } | null;
  const tenantId = c.get('tenantId');
  if (!user || !tenantId) return c.json({ error: 'Unauthorized' }, 401);

  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.tenantId, tenantId),
        eq(notifications.userId, user.id),
        eq(notifications.read, false),
      ),
    );

  await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.tenantId, tenantId),
        eq(notifications.userId, user.id),
        eq(notifications.read, false),
      ),
    );

  await logAudit('NOTIFICATION_READ', user.id, {
    action: 'read_all',
    count: Number(countRow?.count ?? 0),
  }, c);

  return c.json({ success: true });
});

export default app;
