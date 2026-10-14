import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { auth } from '../auth';
import { db } from '../db';
import { invitation, onboardTokens, user, verification } from '../db/schema';
import { errorResponse } from '../error-response';
import { completeOnboardSchema } from '../validators';
import type { LoggerVariables } from '../logger';

const app = new Hono<{ Variables: LoggerVariables }>();

app.get('/validate', async (c) => {
  const token = c.req.query('token');
  if (!token || typeof token !== 'string') {
    return c.json({ error: 'Token is required' }, 400);
  }

  // Check onboard tokens first (legacy flow)
  const [onboardRow] = await db
    .select({
      id: onboardTokens.id,
      userId: onboardTokens.userId,
      expiresAt: onboardTokens.expiresAt,
      usedAt: onboardTokens.usedAt,
      userEmail: user.email,
      userName: user.name,
    })
    .from(onboardTokens)
    .innerJoin(user, eq(onboardTokens.userId, user.id))
    .where(eq(onboardTokens.token, token))
    .limit(1);

  if (onboardRow) {
    if (onboardRow.usedAt) return c.json({ error: 'This link has already been used' }, 410);
    if (new Date() > onboardRow.expiresAt) return c.json({ error: 'This link has expired' }, 410);
    return c.json({ data: { email: onboardRow.userEmail, name: onboardRow.userName } });
  }

  // Check invitation table (new flow)
  const [inviteRow] = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      name: invitation.name,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      usedAt: invitation.usedAt,
    })
    .from(invitation)
    .where(eq(invitation.token, token))
    .limit(1);

  if (!inviteRow) return c.json({ error: 'Invalid token' }, 404);
  if (inviteRow.status !== 'pending')
    return c.json({ error: 'This invitation has already been used' }, 410);
  if (new Date() > inviteRow.expiresAt)
    return c.json({ error: 'This invitation has expired' }, 410);

  return c.json({ data: { email: inviteRow.email, name: inviteRow.name } });
});

app.post('/complete', async (c) => {
  const parsed = completeOnboardSchema.safeParse(await c.req.json());
  if (!parsed.success) return errorResponse(c, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join(', '), 400);
  const { token, password, name: displayName } = parsed.data!;

  // Check onboard tokens first (legacy flow)
  const [onboardRow] = await db
    .select({
      id: onboardTokens.id,
      userId: onboardTokens.userId,
      expiresAt: onboardTokens.expiresAt,
      usedAt: onboardTokens.usedAt,
    })
    .from(onboardTokens)
    .where(eq(onboardTokens.token, token))
    .limit(1);

  if (onboardRow) {
    if (onboardRow.usedAt) return c.json({ error: 'This link has already been used' }, 410);
    if (new Date() > onboardRow.expiresAt) return c.json({ error: 'This link has expired' }, 410);

    try {
      await auth.api.resetPassword({
        body: { newPassword: password, token },
      });
    } catch (err) {
      const baErr = err as { status?: number; message?: string };
      c.get('logger').error({ err }, 'onboard resetPassword failed');
      return c.json(
        { error: baErr.message || 'Failed to set password' },
        (baErr.status ?? 500) as 400 | 500 | 410,
      );
    }

    await db
      .update(user)
      .set({
        ...(displayName ? { name: displayName } : {}),
        emailVerified: true,
        banned: false,
        banReason: null,
        banExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(user.id, onboardRow.userId));

    await db
      .update(onboardTokens)
      .set({ usedAt: new Date() })
      .where(eq(onboardTokens.id, onboardRow.id));

    return c.json({ data: { success: true } }, 200);
  }

  // Check invitation table (new flow)
  const [inviteRow] = await db
    .select({
      id: invitation.id,
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
      tenantId: invitation.tenantId,
      branchId: invitation.branchId,
      token: invitation.token,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      usedAt: invitation.usedAt,
    })
    .from(invitation)
    .where(eq(invitation.token, token))
    .limit(1);

  if (!inviteRow) return c.json({ error: 'Invalid token' }, 404);
  if (inviteRow.status !== 'pending')
    return c.json({ error: 'This invitation has already been used' }, 410);
  if (new Date() > inviteRow.expiresAt)
    return c.json({ error: 'This invitation has expired' }, 410);

  // Create the user and associated records in a transaction
  // to prevent orphan users if the server crashes partway through
  const userId = randomUUID();
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id: userId,
      email: inviteRow.email,
      name: displayName || inviteRow.name || inviteRow.email.split('@')[0] || 'User',
      emailVerified: true,
      role: inviteRow.role,
      banned: false,
      tenantId: inviteRow.tenantId,
      branchId: inviteRow.branchId,
      createdAt: now,
      updatedAt: now,
    });

    // Create verification record for password reset
    await tx.insert(verification).values({
      id: randomUUID(),
      identifier: `reset-password:${token}`,
      value: userId,
      expiresAt: inviteRow.expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    // Mark invitation accepted (within the same transaction)
    await tx
      .update(invitation)
      .set({ status: 'accepted', usedAt: now, updatedAt: now })
      .where(eq(invitation.id, inviteRow.id));
  });

  // Set password via resetPassword (outside transaction — uses Better Auth's internal DB)
  try {
    await auth.api.resetPassword({
      body: { newPassword: password, token },
    });
  } catch (err) {
    // Cleanup on failure: delete the user and reset the invitation
    await db.delete(user).where(eq(user.id, userId));
    await db
      .update(invitation)
      .set({ status: 'pending', usedAt: null, updatedAt: now })
      .where(eq(invitation.id, inviteRow.id));
    const baErr = err as { status?: number; message?: string };
    c.get('logger').error({ err }, 'invitation resetPassword failed');
    return c.json(
      { error: baErr.message || 'Failed to set password' },
      (baErr.status ?? 500) as 400 | 500 | 410,
    );
  }

  return c.json({ data: { success: true } }, 200);
});

export default app;
