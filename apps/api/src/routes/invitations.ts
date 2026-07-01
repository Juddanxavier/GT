import { randomUUID } from 'node:crypto';
import { buildEmailHtml } from '@repo/auth-config';
import { and, eq, isNull, or, type SQL } from 'drizzle-orm';
import { Hono } from 'hono';
import { auth } from '../auth';
import { cacheFlushTenant } from '../cache';
import { db } from '../db';
import { invitation, tenants, user } from '../db/schema';
import { sendEmail } from '../email/provider';
import { getUser, requireRole } from '../middleware/authorization';
import { logAudit } from '../services/audit';
import type { AppVariables } from './types';

const app = new Hono<{ Variables: AppVariables }>();

app.post('/invite', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const currentUser = getUser(c);
  if (!currentUser) return c.json({ error: 'Authentication required' }, 401);

  const body = (await c.req.json()) as Record<string, string | undefined>;
  const email = body.email?.toLowerCase().trim();
  if (!email) return c.json({ error: 'Email is required' }, 400);

  // Check if there's already a pending invitation for this email
  const [pending] = await db
    .select({ id: invitation.id })
    .from(invitation)
    .where(and(eq(invitation.email, email), eq(invitation.status, 'pending')))
    .limit(1);
  if (pending) {
    return c.json({ error: 'A pending invitation already exists for this email' }, 409);
  }

  // Check if user already exists with this email
  const [existing] = await db
    .select({ id: user.id, tenantId: user.tenantId })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (existing) {
    const inScope =
      currentUser.role === 'superadmin'
        ? !c.get('tenantId') || !existing.tenantId || existing.tenantId === c.get('tenantId')
        : existing.tenantId === currentUser.tenantId;
    if (inScope) {
      return c.json({ error: 'A user with this email already exists' }, 409);
    }
    return c.json({ error: 'This email is already registered to another organization' }, 409);
  }

  const role = body.role ?? 'staff';
  const branchId = body.branchId || '';

  // Role validation
  const ALLOWED_TO_CREATE: Record<string, string[]> = {
    superadmin: ['superadmin', 'tenant-admin', 'staff'],
    'tenant-admin': ['staff'],
  };
  const allowedRoles = ALLOWED_TO_CREATE[currentUser.role];
  if (!allowedRoles || !allowedRoles.includes(role)) {
    return c.json({ error: `Cannot invite user with role '${role}'` }, 403);
  }

  let tenantId: string;
  if (currentUser.role === 'superadmin') {
    tenantId = body.tenantId || c.get('tenantId') || '';
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

  const displayedName = body.name?.trim() || email.split('@')[0] || 'User';

  // Create invitation
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [invite] = await db
    .insert(invitation)
    .values({
      email,
      name: displayedName,
      role,
      tenantId: tenantId || null,
      branchId: branchId || null,
      token,
      invitedById: currentUser.id,
      status: 'pending',
      expiresAt,
    })
    .returning();

  if (!invite) return c.json({ error: 'Failed to create invitation' }, 500);

  await logAudit('INVITATION_CREATED', invite.id, { email, role, tenantId }, c);

  // Send invitation email
  const appUrl = c.req.header('Origin') || process.env.APP_URL || `https://${c.req.header('Host') || 'localhost:3000'}`;
  const inviteLink = `${appUrl}/onboard?token=${token}`;

  await sendEmail({
    to: email,
    subject: "You've been invited to Gajan Traders",
    html: buildEmailHtml({
      title: 'Invitation',
      bodyHtml: `<table role="presentation" style="width:100%">
        <tr>
          <td style="text-align:center;padding-bottom:16px">
            <p style="font-size:13px;margin:0 0 4px;color:#52525b">Hello${displayedName ? ' ' + displayedName : ''},</p>
            <p style="font-size:13px;margin:0;color:#52525b">You've been invited as <strong style="color:#18181b">${role}</strong>.</p>
          </td>
        </tr>
        <tr>
          <td style="text-align:center;padding:16px 0">
            <a href="${inviteLink}"
               style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:13px;font-weight:700;letter-spacing:-0.2px">
              Accept Invitation →
            </a>
          </td>
        </tr>
        <tr>
          <td>
            <p style="font-size:11px;margin:0;color:#a1a1aa;text-align:center">This link expires in 7 days. If you didn't expect this invitation, you can safely ignore it.</p>
          </td>
        </tr>
      </table>`,
    }),
  });

  await logAudit('NOTIFICATION_SENT', invite.id, {
    channel: 'email',
    type: 'invitation',
    recipient: email,
    role,
    tenantId: tenantId ?? undefined,
  }, c);

  const tenantForCache = c.get('tenantId') || tenantId;
  if (tenantForCache) await cacheFlushTenant(tenantForCache!);
  return c.json({ data: { id: invite.id, email } }, 201);
});

app.get('/', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const currentUser = getUser(c);
  if (!currentUser) return c.json({ error: 'Authentication required' }, 401);

  const overrideTenantId = c.get('tenantId');

  if (currentUser.role === 'superadmin') {
    if (!overrideTenantId) return c.json({ error: 'Tenant required' }, 400);
    const rows = await db
      .select()
      .from(invitation)
      .where(and(or(eq(invitation.tenantId, overrideTenantId!), isNull(invitation.tenantId))) as SQL | undefined)
      .orderBy(invitation.createdAt);
    return c.json({ data: rows });
  }

  const conditions: ReturnType<typeof eq>[] = [];
  if (!currentUser.tenantId) return c.json({ error: 'No tenant assigned' }, 400);
  conditions.push(eq(invitation.tenantId, currentUser.tenantId!));

  const rows = await db
    .select()
    .from(invitation)
    .where(and(...conditions) as SQL | undefined)
    .orderBy(invitation.createdAt);

  return c.json({ data: rows });
});

app.delete('/:id', requireRole('superadmin', 'tenant-admin'), async (c) => {
  const currentUser = getUser(c);
  if (!currentUser) return c.json({ error: 'Authentication required' }, 401);

  const { id } = c.req.param();

  const conditions: SQL[] = [eq(invitation.id, id!) as SQL];
  if (currentUser.role === 'superadmin') {
    const overrideTenantId = c.get('tenantId');
    if (!overrideTenantId) return c.json({ error: 'Tenant required' }, 400);
    conditions.push(or(eq(invitation.tenantId, overrideTenantId!), isNull(invitation.tenantId)));
  } else {
    if (!currentUser.tenantId) return c.json({ error: 'No tenant assigned' }, 400);
    conditions.push(eq(invitation.tenantId, currentUser.tenantId!));
  }

  const [target] = await db
    .select({ id: invitation.id, email: invitation.email, status: invitation.status })
    .from(invitation)
    .where(and(...conditions) as SQL | undefined)
    .limit(1);

  if (!target) return c.json({ error: 'Invitation not found' }, 404);

  await db
    .update(invitation)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(invitation.id, id!));

  await logAudit('INVITATION_CANCELLED', id, { email: target.email }, c);
  return c.json({ data: { success: true } });
});

export default app;
