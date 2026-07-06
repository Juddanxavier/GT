/** @format */

import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { auth } from '../auth';
import { cacheClient } from '../redis';

// Extend Hono's context variables type
export type AuthVariables = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};

// Cache TTL for session lookups (seconds).
// Short enough to pick up session revocation/role changes quickly,
// long enough to absorb burst traffic without hammering PostgreSQL.
const SESSION_CACHE_TTL = 5;

export async function sessionMiddleware(c: Context, next: Next) {
  const token = getCookie(c, 'better-auth.session_token');

  // Redis cache: skip PG query if session was recently fetched
  if (cacheClient && token) {
    try {
      const cached = await cacheClient.get(`session:${token}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.user && parsed?.session) {
          c.set('user', parsed.user);
          c.set('session', parsed.session);
          await next();
          return;
        }
      }
    } catch {
      // Cache miss or Redis down — fall through to PG query
    }
  }

  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (session) {
    c.set('user', session.user);
    c.set('session', session.session);
    if (cacheClient && token) {
      // Fire-and-forget cache write (never block the response)
      cacheClient.set(`session:${token}`, JSON.stringify(session), 'EX', SESSION_CACHE_TTL).catch(() => {});
    }
  } else {
    c.set('user', null);
    c.set('session', null);
  }

  await next();
}
