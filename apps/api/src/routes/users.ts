import { Hono } from 'hono';
import { eq, and, or, sql } from 'drizzle-orm';
import { db } from '../db';
import { user, session } from '../db/schema';
import { requireRole, getUser } from '../middleware/authorization';
import type { AppVariables } from './types';

const app = new Hono<{ Variables: AppVariables }>();

app.get('/', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const currentUser = getUser(c);
  if (!currentUser) return c.json({ error: 'Authentication required' }, 401);

  const search = c.req.query('search');
  const roleFilter = c.req.query('role');

  const conditions: ReturnType<typeof eq>[] = [];

  if (currentUser.role === 'superadmin') {
    // Superadmin sees all users
  } else if (currentUser.role === 'tenant-admin') {
    // Tenant-admin sees users in their own tenant
    if (!currentUser.tenantId) return c.json({ error: 'No tenant assigned' }, 400);
    conditions.push(eq(user.tenantId, currentUser.tenantId));
  } else {
    // Staff sees only customer-role users in their own tenant
    if (!currentUser.tenantId) return c.json({ error: 'No tenant assigned' }, 400);
    conditions.push(eq(user.tenantId, currentUser.tenantId));
    conditions.push(eq(user.role, 'customer'));
  }

  if (search) {
    const q = `%${search}%`;
    conditions.push(
      sql`(${sql`${user.name} ILIKE ${q}`} OR ${sql`${user.email} ILIKE ${q}`})`,
    );
  }

  if (roleFilter) {
    conditions.push(eq(user.role, roleFilter));
  }

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      role: user.role,
      banned: user.banned,
      banReason: user.banReason,
      banExpires: user.banExpires,
      tenantId: user.tenantId,
      branchId: user.branchId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(and(...conditions))
    .orderBy(user.createdAt);

  return c.json({ data: rows });
});

app.get('/:id', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const currentUser = getUser(c);
  if (!currentUser) return c.json({ error: 'Authentication required' }, 401);

  const { id } = c.req.param();
  const conditions: ReturnType<typeof eq>[] = [eq(user.id, id)];

  if (currentUser.role !== 'superadmin') {
    if (!currentUser.tenantId) return c.json({ error: 'No tenant assigned' }, 400);
    conditions.push(eq(user.tenantId, currentUser.tenantId));
    if (currentUser.role === 'staff') {
      conditions.push(eq(user.role, 'customer'));
    }
  }

  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      role: user.role,
      banned: user.banned,
      banReason: user.banReason,
      banExpires: user.banExpires,
      tenantId: user.tenantId,
      branchId: user.branchId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(and(...conditions))
    .limit(1);

  if (!row) return c.json({ error: 'User not found' }, 404);
  return c.json({ data: row });
});

app.patch('/:id', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const currentUser = getUser(c);
  if (!currentUser) return c.json({ error: 'Authentication required' }, 401);

  const { id } = c.req.param();
  const body = await c.req.json() as Record<string, unknown>;

  // Verify access
  const conditions: ReturnType<typeof eq>[] = [eq(user.id, id)];
  if (currentUser.role !== 'superadmin') {
    if (!currentUser.tenantId) return c.json({ error: 'No tenant assigned' }, 400);
    conditions.push(eq(user.tenantId, currentUser.tenantId));
    if (currentUser.role === 'staff') {
      conditions.push(eq(user.role, 'customer'));
    }
  }

  const allowedFields: Record<string, 1> = {
    name: 1, email: 1, branchId: 1,
  };
  if (currentUser.role === 'superadmin') {
    allowedFields.tenantId = 1;
    allowedFields.role = 1;
  }
  if (currentUser.role === 'superadmin' || currentUser.role === 'tenant-admin') {
    allowedFields.role = 1;
  }

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (allowedFields[key]) updates[key] = value;
  }

  if (Object.keys(updates).length === 0) {
    return c.json({ error: 'No valid fields to update' }, 400);
  }

  const [row] = await db
    .update(user)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(...conditions))
    .returning({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      role: user.role,
      banned: user.banned,
      tenantId: user.tenantId,
      branchId: user.branchId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });

  if (!row) return c.json({ error: 'User not found' }, 404);
  return c.json({ data: row });
});

app.delete('/:id', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const currentUser = getUser(c);
  if (!currentUser) return c.json({ error: 'Authentication required' }, 401);

  const { id } = c.req.param();
  if (id === currentUser.id) {
    return c.json({ error: 'Cannot delete yourself' }, 400);
  }

  const conditions: ReturnType<typeof eq>[] = [eq(user.id, id)];
  if (currentUser.role !== 'superadmin') {
    if (!currentUser.tenantId) return c.json({ error: 'No tenant assigned' }, 400);
    conditions.push(eq(user.tenantId, currentUser.tenantId));
  }

  const [target] = await db
    .select({ id: user.id, role: user.role, tenantId: user.tenantId })
    .from(user)
    .where(and(...conditions))
    .limit(1);

  if (!target) return c.json({ error: 'User not found' }, 404);

  // Tenant-admin cannot delete superadmin or admin
  if (currentUser.role === 'tenant-admin' && (target.role === 'superadmin' || target.role === 'admin')) {
    return c.json({ error: 'Cannot delete this user' }, 403);
  }

  // Cascade delete: sessions, accounts, verifications
  await db.delete(session).where(eq(session.userId, id));
  await db.delete(user).where(eq(user.id, id));

  return c.json({ data: { success: true } });
});

export default app;
