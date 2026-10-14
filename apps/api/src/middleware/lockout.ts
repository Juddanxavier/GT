import type { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { auth } from '../auth';
import { db } from '../db';
import { user as userTable } from '../db/schema';
import { cacheClient } from '../redis';
import { logAudit } from '../services/audit';
import { errorResponse } from '../error-response';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 1800;
const ATTEMPT_WINDOW_SECONDS = 1800;

const fallbackLockouts = new Map<string, { lockedUntil: number }>();
const fallbackAttempts = new Map<string, number>();

async function extractEmail(c: Context): Promise<string> {
  try {
    const body = (await c.req.raw.clone().json()) as Record<string, unknown>;
    return (body.email as string) ?? '';
  } catch {
    return '';
  }
}

async function resolveTenantIdForEmail(email: string): Promise<string | null> {
  try {
    const [user] = await db
      .select({ tenantId: userTable.tenantId })
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1);
    return user?.tenantId ?? null;
  } catch {
    return null;
  }
}

function lockoutKey(email: string, tenantId: string | null): string {
  return tenantId ? `lockout:${tenantId}:${email}` : `lockout:${email}`;
}

function attemptsKey(email: string, tenantId: string | null): string {
  return tenantId ? `attempts:${tenantId}:${email}` : `attempts:${email}`;
}

export async function signInHandler(c: Context) {
  const email = await extractEmail(c);
  const tenantId = email ? await resolveTenantIdForEmail(email) : null;

  if (email) {
    if (!cacheClient || fallbackLockouts.size > 0) {
      const now = Date.now();
      const lockEntry = fallbackLockouts.get(email.toLowerCase());
      if (lockEntry && lockEntry.lockedUntil > now) {
        const remainingMin = Math.ceil((lockEntry.lockedUntil - now) / 60000);
        await logAudit('LOGIN_BLOCKED', null, { email, tenantId, remainingSeconds: Math.ceil((lockEntry.lockedUntil - now) / 1000) }, c);
        return errorResponse(c, 'ACCOUNT_LOCKED', `Account locked due to too many failed attempts. Try again in ${remainingMin} minutes.`, 423);
      }
    } else {
      try {
        const lKey = lockoutKey(email, tenantId);
        const locked = await cacheClient.get(lKey);
        if (locked) {
          const ttl = await cacheClient.ttl(lKey);
          await logAudit('LOGIN_BLOCKED', null, { email, tenantId, remainingSeconds: ttl }, c);
          return errorResponse(c, 'ACCOUNT_LOCKED', `Account locked due to too many failed attempts. Try again in ${Math.ceil(ttl / 60)} minutes.`, 423);
        }
      } catch (err) {
        c.get('logger').error({ err }, 'lockout redis error during check, allowing request');
      }
    }
  }

  const res = await auth.handler(c.req.raw);

  if (email) {
    const useFallback = !cacheClient;
    const now = Date.now();
    const emailLower = email.toLowerCase();

    if (useFallback) {
      const failKey = attemptsKey(email, tenantId);
      if (res.status === 200) {
        fallbackLockouts.delete(emailLower);
        fallbackAttempts.delete(failKey);
        let userId: string | null = null;
        try {
          const body = await res.clone().json() as Record<string, unknown>;
          userId = (body?.user as Record<string, unknown> | undefined)?.id as string ?? null;
        } catch { /* ignore */ }
        await logAudit('LOGIN_SUCCESS', userId, { email, tenantId }, c);
      } else if (res.status === 401) {
        const attempts = (fallbackAttempts.get(failKey) ?? 0) + 1;
        fallbackAttempts.set(failKey, attempts);
        setTimeout(() => fallbackAttempts.delete(failKey), ATTEMPT_WINDOW_SECONDS * 1000);
        await logAudit('LOGIN_FAILED', null, { email, tenantId, attempts: `${attempts}/${MAX_ATTEMPTS}` }, c);
        if (attempts >= MAX_ATTEMPTS) {
          fallbackLockouts.set(emailLower, { lockedUntil: now + LOCKOUT_SECONDS * 1000 });
          await logAudit('USER_BANNED', null, { email, tenantId, reason: `${MAX_ATTEMPTS} failed attempts - locked 30m` }, c);
        }
      }
    } else {
      try {
        if (res.status === 200) {
          await cacheClient.del(lockoutKey(email, tenantId));
          await cacheClient.del(attemptsKey(email, tenantId));
          let userId: string | null = null;
          try {
            const body = await res.clone().json() as Record<string, unknown>;
            userId = (body?.user as Record<string, unknown> | undefined)?.id as string ?? null;
          } catch { /* ignore */ }
          await logAudit('LOGIN_SUCCESS', userId, { email, tenantId }, c);
        } else if (res.status === 401) {
          const attempts = await cacheClient.incr(attemptsKey(email, tenantId));
          if (attempts === 1) {
            await cacheClient.expire(attemptsKey(email, tenantId), ATTEMPT_WINDOW_SECONDS);
          }
          await logAudit('LOGIN_FAILED', null, { email, tenantId, attempts: `${attempts}/${MAX_ATTEMPTS}` }, c);
          if (attempts >= MAX_ATTEMPTS) {
            await cacheClient.setex(lockoutKey(email, tenantId), LOCKOUT_SECONDS, '1');
            await logAudit('USER_BANNED', null, { email, tenantId, reason: `${MAX_ATTEMPTS} failed attempts - locked 30m` }, c);
          }
        }
      } catch (err) {
        c.get('logger').error({ err }, 'lockout redis error during attempt tracking');
      }
    }
  }

  return res;
}
