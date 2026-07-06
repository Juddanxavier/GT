import { randomUUID } from 'node:crypto';
import { buildEmailHtml } from '@repo/auth-config';
import { and, eq, type SQL, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { auth } from '../auth';
import { cacheDel, cacheFlushTenant } from '../cache';
import { db } from '../db';
import { account, onboardTokens, session, tenants, user, verification } from '../db/schema';
import { sendEmail } from '../email/provider';
import { getUser, requireBranchScope, requireRole } from '../middleware/authorization';
import { errorResponse } from '../error-response';
import { updateUserSchema, createUserSchema, banUserSchema } from '../validators';
import { logAudit } from '../services/audit';
import type { AppVariables } from './types';

const app = new Hono<{ Variables: AppVariables }>();

app.get(
  '/',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const currentUser = getUser(c);
  if (!currentUser) return errorResponse(c, 'AUTH_REQUIRED', 'Authentication required', 401);

  const search = c.req.query('search');
    const roleFilter = c.req.query('role');
    const bannedFilter = c.req.query('banned');
    const page = Math.max(1, parseInt(c.req.query('page') ?? '', 10) || 0);
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') ?? '', 10) || 50));
    const hasPagination = page > 0;

    const conditions: (ReturnType<typeof eq> | SQL)[] = [];

    const overrideTenantId = c.get('tenantId');
    if (currentUser.role === 'superadmin') {
      if (!overrideTenantId) return c.json({ error: 'Tenant required' }, 400);
      conditions.push(
        sql`(${eq(user.tenantId, overrideTenantId!)} OR ${sql`${user.tenantId} IS NULL`})`,
      );
    } else if (currentUser.role === 'tenant-admin') {
      if (!currentUser.tenantId) return c.json({ error: 'No tenant assigned' }, 400);
      conditions.push(eq(user.tenantId, currentUser.tenantId!));
    } else {
      if (!currentUser.tenantId) return c.json({ error: 'No tenant assigned' }, 400);
      if (!currentUser.branchId) return c.json({ error: 'No branch assigned' }, 400);
      conditions.push(eq(user.tenantId, currentUser.tenantId!));
      conditions.push(eq(user.branchId, currentUser.branchId!));
      conditions.push(eq(user.role, 'customer'));
    }

    if (search) {
      const q = `%${search}%`;
      conditions.push(sql`(${sql`${user.name} ILIKE ${q}`} OR ${sql`${user.email} ILIKE ${q}`})`);
    }

    if (roleFilter) {
      conditions.push(eq(user.role, roleFilter!));
    }

    if (bannedFilter === 'true') {
      conditions.push(sql`${user.banned} IS TRUE`);
    } else if (bannedFilter === 'false') {
      conditions.push(sql`${user.banned} IS NOT TRUE`);
    }

    const selectFields = {
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
    };

    if (hasPagination) {
      const [countRow] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(user)
        .where(and(...conditions) as SQL | undefined);
      const count = countRow?.count ?? 0;
      const offset = (page - 1) * limit;

      const rows = await db
        .select(selectFields)
        .from(user)
        .where(and(...conditions) as SQL | undefined)
        .orderBy(user.createdAt)
        .limit(limit)
        .offset(offset);

      // Compute active/banned counts from ALL matching records (ignoring banned filter)
      const countConditions: (ReturnType<typeof eq> | SQL)[] = [];
      if (currentUser.role === 'superadmin') {
        if (!overrideTenantId) return c.json({ error: 'Tenant required' }, 400);
        countConditions.push(
          sql`(${eq(user.tenantId, overrideTenantId!)} OR ${sql`${user.tenantId} IS NULL`})`,
        );
      } else if (currentUser.role === 'tenant-admin') {
        countConditions.push(eq(user.tenantId, currentUser.tenantId!));
      } else {
        countConditions.push(eq(user.tenantId, currentUser.tenantId!));
        countConditions.push(eq(user.branchId, currentUser.branchId!));
        countConditions.push(eq(user.role, 'customer'));
      }
      if (search) {
        const q = `%${search}%`;
        countConditions.push(sql`(${sql`${user.name} ILIKE ${q}`} OR ${sql`${user.email} ILIKE ${q}`})`);
      }
      if (roleFilter) countConditions.push(eq(user.role, roleFilter!));
      // NOTE: banned filter is intentionally excluded from counts
      // so KPI cards always show the full breakdown regardless of banned filter

      const bannedCountRows = await db
        .select({
          isBanned: sql<boolean>`${user.banned} IS TRUE`,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(user)
        .where(and(...countConditions) as SQL | undefined)
        .groupBy(sql`${user.banned} IS TRUE`);

      const counts: Record<string, number> = { total: count, active: 0, banned: 0 };
      for (const r of bannedCountRows) {
        if (r.isBanned) counts.banned = r.count;
        else counts.active = r.count;
      }

      return c.json({ data: rows, total: count, page, limit, counts });
    }

    const rows = await db
      .select(selectFields)
      .from(user)
      .where(and(...conditions) as SQL | undefined)
      .orderBy(user.createdAt);

    return c.json({ data: rows });
  },
);

app.get(
  '/:id',
  requireRole('superadmin', 'tenant-admin', 'staff'),
  requireBranchScope(),
  async (c) => {
    const currentUser = getUser(c);
    if (!currentUser) return c.json({ error: 'Authentication required' }, 401);

    const { id } = c.req.param();
    const conditions: ReturnType<typeof eq>[] = [eq(user.id, id!)];

    if (currentUser.role === 'superadmin') {
      const overrideTenantId = c.get('tenantId');
      if (!overrideTenantId) return c.json({ error: 'Tenant required' }, 400);
      conditions.push(
        sql`(${eq(user.tenantId, overrideTenantId!)} OR ${sql`${user.tenantId} IS NULL`})`,
      );
    } else {
      if (!currentUser.tenantId) return c.json({ error: 'No tenant assigned' }, 400);
      conditions.push(eq(user.tenantId, currentUser.tenantId!));
      if (currentUser.role === 'staff') {
        if (!currentUser.branchId) return c.json({ error: 'No branch assigned' }, 400);
        conditions.push(eq(user.role, 'customer'));

        conditions.push(eq(user.branchId, currentUser.branchId!));
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
      .where(and(...conditions) as SQL | undefined)
      .limit(1);

    if (!row) return c.json({ error: 'User not found' }, 404);
    return c.json({ data: row });
  },
);

app.patch('/:id', requireRole('superadmin', 'tenant-admin', 'staff'), async (c) => {
  const currentUser = getUser(c);
  if (!currentUser) return errorResponse(c, 'AUTH_REQUIRED', 'Authentication required', 401);

  const { id } = c.req.param();
  const parsed = updateUserSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join(', '), 400);
  const body = parsed.data as Record<string, unknown>;

  // Verify access
  const conditions: ReturnType<typeof eq>[] = [eq(user.id, id!)];
  if (currentUser.role === 'superadmin') {
    const overrideTenantId = c.get('tenantId');
    if (!overrideTenantId) return c.json({ error: 'Tenant required' }, 400);
    conditions.push(eq(user.tenantId, overrideTenantId!));
  } else {
    if (!currentUser.tenantId) return c.json({ error: 'No tenant assigned' }, 400);
    conditions.push(eq(user.tenantId, currentUser.tenantId!));
    if (currentUser.role === 'staff') {
      if (!currentUser.branchId) return c.json({ error: 'No branch assigned' }, 400);
      conditions.push(eq(user.role, 'customer'));

      conditions.push(eq(user.branchId, currentUser.branchId!));
    }
  }

  const allowedFields: Record<string, 1> = {
    name: 1,
    email: 1,
    branchId: 1,
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

  // Capture full before state for audit
  const [before] = await db
    .select({
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      tenantId: user.tenantId,
    })
    .from(user)
    .where(and(...conditions) as SQL | undefined)
    .limit(1);

  if (!before) return c.json({ error: 'User not found' }, 404);

  const [row] = await db
    .update(user)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(...conditions) as SQL | undefined)
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

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of ['name', 'email', 'role', 'branchId', 'tenantId'] as const) {
    if (key in updates) {
      const oldVal = before[key];
      const newVal = row[key];
      if (String(oldVal) !== String(newVal)) {
        changes[key] = { from: oldVal, to: newVal };
      }
    }
  }

  if (Object.keys(changes).length > 0) {
    if (changes.role) {
      await logAudit('USER_ROLE_CHANGED', id ?? null, changes, c);
      // Revoke all active sessions when role changes, forcing re-login with new permissions
      try {
        await db.delete(session).where(eq(session.userId, id!));
        console.log(`[security] Sessions revoked for user ${id} due to role change`);
      } catch (err) {
        console.error('[security] Failed to revoke sessions on role change:', err);
      }
    } else {
      await logAudit('USER_UPDATED', id ?? null, changes, c);
    }
  }

  const tenantForCache = c.get('tenantId') ?? currentUser.tenantId;
  if (tenantForCache) await cacheFlushTenant(tenantForCache!);
  return c.json({ data: row });
});

app.post('/create', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const currentUser = getUser(c);
  if (!currentUser) return errorResponse(c, 'AUTH_REQUIRED', 'Authentication required', 401);

  const parsed = createUserSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join(', '), 400);
  const body = parsed.data!;
  const email = body.email.toLowerCase().trim();

  // Check for existing user with this email globally (needed because email is globally unique)
  const [existing] = await db
    .select({ id: user.id, tenantId: user.tenantId })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (existing) {
    // If the email belongs to a user in the current scope, tell them it exists
    // If it belongs to another tenant, tell them it's taken elsewhere
    const inScope =
      currentUser.role === 'superadmin'
        ? !c.get('tenantId') || !existing.tenantId || existing.tenantId === c.get('tenantId')
        : existing.tenantId === currentUser.tenantId;
    if (inScope) {
      return c.json({ error: 'A user with this email already exists' }, 409);
    }
    return c.json({ error: 'This email is already registered to another organization' }, 409);
  }

  // Clean up orphan account records (email/password accounts) left behind when
  // a user was deleted from the user table but the account record survived
  const [orphanAccount] = await db
    .select({ id: account.id, userId: account.userId })
    .from(account)
    .where(and(eq(account.providerId, 'credential'), eq(account.accountId, email)))
    .limit(1);
  if (orphanAccount) {
    await db.delete(account).where(eq(account.id, orphanAccount.id));
  }

  const displayedName = body.name?.trim() || email.split('@')[0] || 'User';
  const role = body.role ?? 'staff';
  const branchId = body.branchId || '';

  // Role validation
  const ALLOWED_TO_CREATE: Record<string, string[]> = {
    superadmin: ['superadmin', 'tenant-admin', 'staff'],
    'tenant-admin': ['staff'],
  };
  const allowedRoles = ALLOWED_TO_CREATE[currentUser.role];
  if (!allowedRoles || !allowedRoles.includes(role)) {
    return c.json({ error: `Cannot create user with role '${role}'` }, 403);
  }

  // Tenant validation
  let tenantId: string;
  if (currentUser.role === 'superadmin') {
    tenantId = body.tenantId || '';
    if (tenantId) {
      const [tenantExists] = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.id, tenantId!))
        .limit(1);
      if (!tenantExists) return c.json({ error: 'Tenant not found' }, 400);
    }
  } else {
    if (!currentUser.tenantId) return c.json({ error: 'No tenant assigned' }, 400);
    tenantId = currentUser.tenantId;
  }

  let createdUserId: string;
  try {
    const tempPassword = randomUUID();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createResponse: any = await (auth.api as any).createUser({
      body: {
        email,
        name: displayedName,
        password: tempPassword,
        role: role as 'superadmin' | 'tenant-admin' | 'staff',
        data: Object.fromEntries(Object.entries({ tenantId, branchId }).filter(([, v]) => v)),
      },
      headers: c.req.raw.headers,
    });

    if (!createResponse || typeof createResponse !== 'object') {
      console.error('[users/create] unexpected response type:', typeof createResponse);
      return c.json({ error: 'Failed to create user: unexpected response from auth service' }, 500);
    }

    if ('id' in createResponse) {
      createdUserId = createResponse.id;
    } else if (
      'user' in createResponse &&
      createResponse.user &&
      typeof createResponse.user === 'object' &&
      'id' in createResponse.user
    ) {
      createdUserId = createResponse.user.id;
    } else {
      console.error(
        '[users/create] unexpected response shape:',
        JSON.stringify(Object.keys(createResponse)),
      );
      return c.json({ error: 'Failed to create user: unexpected response from auth service' }, 500);
    }

    if (!createdUserId) {
      return c.json({ error: 'Failed to create user: empty user ID' }, 500);
    }
  } catch (err) {
    const baErr = err as { status?: number; message?: string; body?: { error?: string } };
    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    if (existingUser) {
      createdUserId = existingUser.id;
    } else {
      const status = baErr.status ?? 500;
      const msg = baErr.body?.error || baErr.message || 'Failed to create user';
      return c.json({ error: msg }, status as 400 | 403 | 409 | 500);
    }
  }

  // Ban user until they complete onboarding
  try {
    await (auth.api as any).banUser({
      body: { userId: createdUserId, banReason: 'Activate your account' },
      headers: c.req.raw.headers,
    });
  } catch (err) {
    console.error('[users/create] banUser error:', err);
  }

  // Generate onboard token
  const onboardToken = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(onboardTokens).values({
    userId: createdUserId,
    token: onboardToken,
    expiresAt,
  });

  // Create verification entry for Better Auth resetPassword
  await db.insert(verification).values({
    id: randomUUID(),
    value: createdUserId,
    identifier: `reset-password:${onboardToken}`,
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await logAudit('USER_CREATED', createdUserId, { email, role, tenantId, branchId }, c);

  // Send activation email
  const appUrl = c.req.header('Origin') || process.env.APP_URL || `https://${c.req.header('Host') || 'localhost:3000'}`;
  const activateLink = `${appUrl}/onboard?token=${onboardToken}`;

  await sendEmail({
    to: email,
    subject: 'Set up your Gajan Traders account',
    html: buildEmailHtml({
      title: 'Activation',
      bodyHtml: `<table role="presentation" style="width:100%">
        <tr>
          <td style="text-align:center;padding-bottom:16px">
            <p style="font-size:13px;margin:0 0 4px;color:#52525b">Hello ${displayedName},</p>
            <p style="font-size:13px;margin:0;color:#52525b">Your account has been created as <strong style="color:#18181b">${role}</strong>.</p>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding:16px 0">
            <a href="${activateLink}"
               style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:13px;font-weight:700;letter-spacing:-0.2px">
              Set up your account →
            </a>
          </td>
        </tr>
        <tr>
          <td>
            <p style="font-size:11px;margin:0;color:#a1a1aa;text-align:center">This link expires in 7 days. If you didn't expect this email, you can safely ignore it.</p>
          </td>
        </tr>
      </table>`,
    }),
  });

  await logAudit('NOTIFICATION_SENT', createdUserId, {
    channel: 'email',
    type: 'activation',
    recipient: email,
    role,
    tenantId: tenantId ?? undefined,
  }, c);

  const tenantForCache = c.get('tenantId') || tenantId;
  if (tenantForCache) await cacheFlushTenant(tenantForCache!);
  return c.json({ data: { id: createdUserId, email } }, 201);
});

app.post('/:id/ban', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const currentUser = getUser(c);
  if (!currentUser) return errorResponse(c, 'AUTH_REQUIRED', 'Authentication required', 401);

  const { id } = c.req.param();
  const parsed = banUserSchema.safeParse(await c.req.json().catch(() => ({})));
  const banReason = parsed.success && parsed.data?.banReason ? parsed.data.banReason : 'Banned by admin';

  // Verify access
  const conditions: ReturnType<typeof eq>[] = [eq(user.id, id!)];
  if (currentUser.role === 'superadmin') {
    const overrideTenantId = c.get('tenantId');
    if (!overrideTenantId) return c.json({ error: 'Tenant required' }, 400);
    conditions.push(eq(user.tenantId, overrideTenantId!));
  } else {
    if (!currentUser.tenantId) return c.json({ error: 'No tenant assigned' }, 400);
    conditions.push(eq(user.tenantId, currentUser.tenantId!));
  }

  const [target] = await db
    .select({ id: user.id, email: user.email, role: user.role })
    .from(user)
    .where(and(...conditions) as SQL | undefined)
    .limit(1);

  if (!target) return c.json({ error: 'User not found' }, 404);

  try {
    await (auth.api as any).banUser({
      body: { userId: id!, banReason },
      headers: c.req.raw.headers,
    });
  } catch (err) {
    console.error('[users/ban] error:', err);
    return c.json({ error: 'Failed to ban user' }, 500);
  }

  await logAudit('USER_BANNED', id ?? null, { email: target.email, role: target.role, reason: banReason }, c);
  return c.json({ data: { success: true } });
});

app.post('/:id/unban', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const currentUser = getUser(c);
  if (!currentUser) return c.json({ error: 'Authentication required' }, 401);

  const { id } = c.req.param();

  // Verify access
  const conditions: ReturnType<typeof eq>[] = [eq(user.id, id!)];
  if (currentUser.role === 'superadmin') {
    const overrideTenantId = c.get('tenantId');
    if (!overrideTenantId) return c.json({ error: 'Tenant required' }, 400);
    conditions.push(eq(user.tenantId, overrideTenantId!));
  } else {
    if (!currentUser.tenantId) return c.json({ error: 'No tenant assigned' }, 400);
    conditions.push(eq(user.tenantId, currentUser.tenantId!));
  }

  const [target] = await db
    .select({ id: user.id, email: user.email, role: user.role })
    .from(user)
    .where(and(...conditions) as SQL | undefined)
    .limit(1);

  if (!target) return c.json({ error: 'User not found' }, 404);

  try {
    await (auth.api as any).unbanUser({
      body: { userId: id! },
      headers: c.req.raw.headers,
    });
  } catch (err) {
    console.error('[users/unban] error:', err);
    return c.json({ error: 'Failed to unban user' }, 500);
  }

  await logAudit('USER_UNBANNED', id ?? null, { email: target.email, role: target.role }, c);
  return c.json({ data: { success: true } });
});

app.delete('/:id', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const currentUser = getUser(c);
  if (!currentUser) return c.json({ error: 'Authentication required' }, 401);

  const { id } = c.req.param();
  if (id === currentUser.id) {
    return c.json({ error: 'Cannot delete yourself' }, 400);
  }

  const conditions: ReturnType<typeof eq>[] = [eq(user.id, id!)];
  if (currentUser.role === 'superadmin') {
    const overrideTenantId = c.get('tenantId');
    if (!overrideTenantId) return c.json({ error: 'Tenant required' }, 400);
    conditions.push(eq(user.tenantId, overrideTenantId!));
  } else {
    if (!currentUser.tenantId) return c.json({ error: 'No tenant assigned' }, 400);
    conditions.push(eq(user.tenantId, currentUser.tenantId!));
  }

  const [target] = await db
    .select({ id: user.id, email: user.email, role: user.role, tenantId: user.tenantId })
    .from(user)
    .where(and(...conditions) as SQL | undefined)
    .limit(1);

  if (!target) return c.json({ error: 'User not found' }, 404);

  // Tenant-admin can only delete staff or customer
  if (
    currentUser.role === 'tenant-admin' &&
    target.role !== 'staff' &&
    target.role !== 'customer'
  ) {
    return c.json({ error: 'Cannot delete this user' }, 403);
  }

  // Clean up all associated records before deleting the user
  await db.delete(verification).where(eq(verification.value, id!));
  await db.delete(onboardTokens).where(eq(onboardTokens.userId, id!));
  await db.delete(session).where(eq(session.userId, id!));
  await db.delete(account).where(eq(account.userId, id!));
  await db.delete(user).where(eq(user.id, id!));

  await logAudit('USER_DELETED', id ?? null, { email: target.email, role: target.role }, c);
  const tenantForCache = c.get('tenantId') ?? currentUser.tenantId;
  if (tenantForCache) await cacheFlushTenant(tenantForCache!);
  return c.json({ data: { success: true } });
});

export default app;
