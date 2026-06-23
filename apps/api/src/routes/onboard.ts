import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { onboardTokens, user } from '../db/schema';
import { auth } from '../auth';

const app = new Hono();

app.get('/validate', async (c) => {
  const token = c.req.query('token');
  if (!token || typeof token !== 'string') {
    return c.json({ error: 'Token is required' }, 400);
  }

  const [row] = await db
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

  if (!row) {
    return c.json({ error: 'Invalid token' }, 404);
  }

  if (row.usedAt) {
    return c.json({ error: 'This link has already been used' }, 410);
  }

  if (new Date() > row.expiresAt) {
    return c.json({ error: 'This link has expired' }, 410);
  }

  return c.json({ data: { email: row.userEmail, name: row.userName } });
});

app.post('/complete', async (c) => {
  const body = await c.req.json() as Record<string, string | undefined>;
  const token = body.token?.trim();
  const password = body.password;
  const displayName = body.name?.trim();

  if (!token) return c.json({ error: 'Token is required' }, 400);
  if (!password || password.length < 8) {
    return c.json({ error: 'Password must be at least 8 characters' }, 400);
  }

  const [row] = await db
    .select({
      id: onboardTokens.id,
      userId: onboardTokens.userId,
      expiresAt: onboardTokens.expiresAt,
      usedAt: onboardTokens.usedAt,
    })
    .from(onboardTokens)
    .where(eq(onboardTokens.token, token))
    .limit(1);

  if (!row) return c.json({ error: 'Invalid token' }, 404);
  if (row.usedAt) return c.json({ error: 'This link has already been used' }, 410);
  if (new Date() > row.expiresAt) return c.json({ error: 'This link has expired' }, 410);

  try {
    await auth.api.resetPassword({
      body: { newPassword: password, token },
    });
  } catch (err) {
    const baErr = err as { status?: number; message?: string };
    console.error('[onboard] resetPassword error:', err);
    return c.json({ error: baErr.message || 'Failed to set password' }, baErr.status ?? 500);
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
    .where(eq(user.id, row.userId));

  await db
    .update(onboardTokens)
    .set({ usedAt: new Date() })
    .where(eq(onboardTokens.id, row.id));

  return c.json({ data: { success: true } }, 200);
});

export default app;
