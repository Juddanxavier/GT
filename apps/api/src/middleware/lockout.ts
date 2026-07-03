/** @format */

import type { Context } from 'hono';
import { eq } from 'drizzle-orm';
import { auth } from '../auth';
import { db } from '../db';
import { user as userTable } from '../db/schema';
import { cacheClient } from '../redis';
import { logAudit } from '../services/audit';

function appendClearCookie(headers: Headers, name: string) {
  headers.append('Set-Cookie', `${name}=; Path=/; Secure; SameSite=None; Max-Age=0`);
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 1800;
const ATTEMPT_WINDOW_SECONDS = 1800;

async function extractEmail(c: Context): Promise<string> {
  try {
    const body = (await c.req.raw.clone().json()) as Record<string, unknown>;
    return (body.email as string) ?? '';
  } catch {
    return '';
  }
}

/**
 * Look up the tenantId for a given email to scope lockout keys per-tenant.
 * Returns null if the user doesn't exist (no tenant context to scope against).
 */
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
    if (!cacheClient) {
      console.warn('[lockout] Redis unavailable — account lockout DISABLED. Brute force protection is inactive!');
    } else {
      try {
        const locked = await cacheClient.get(lockoutKey(email, tenantId));
        if (locked) {
          const ttl = await cacheClient.ttl(lockoutKey(email, tenantId));
          await logAudit('LOGIN_BLOCKED', null, { email, tenantId, remainingSeconds: ttl }, c);
          return c.json(
            {
              error: `Account locked due to too many failed attempts. Try again in ${Math.ceil(ttl / 60)} minutes.`,
            },
            423,
          );
        }
      } catch (err) {
        console.error('[lockout] Redis error during lockout check — allowing:', err instanceof Error ? err.message : err);
      }
    }
  }

  let res = await auth.handler(c.req.raw);

  if (email && cacheClient) {
    try {
      if (res.status === 200) {
        await cacheClient.del(lockoutKey(email, tenantId));
        await cacheClient.del(attemptsKey(email, tenantId));
        // Extract userId from the login response body
        let userId: string | null = null;
        try {
          const body = await res.clone().json() as Record<string, unknown>;
          userId = (body?.user as Record<string, unknown> | undefined)?.id as string ?? null;
        } catch {
          // Non-JSON or empty response — userId stays null
        }
        await logAudit('LOGIN_SUCCESS', userId, { email, tenantId }, c);
        if (c.req.url.startsWith('https://')) {
          // Better Auth sets __Secure-better-auth.session_token on HTTPS.
          // Clear any legacy non-secure better-auth.session_token that may
          // have been set from a previous HTTP session to avoid confusion.
          const oldHeaders = new Headers(res.headers);
          appendClearCookie(oldHeaders, 'better-auth.session_token');
          res = new Response(res.body, { status: res.status, statusText: res.statusText, headers: oldHeaders });
        }
      } else if (res.status === 401) {
        if (!cacheClient) {
          console.error('[lockout] Redis unavailable — cannot track failed login attempts! Brute force protection inactive.');
        } else {
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
      }
    } catch (err) {
      console.error('[lockout] Redis error during attempt tracking:', err instanceof Error ? err.message : err);
    }
  }

  return res;
}
