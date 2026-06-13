/** @format */

import type { Context, Next } from 'hono';
import { auth } from '../auth';

// Extend Hono's context variables type
export type AuthVariables = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};

/**
 * Middleware that fetches the current session and injects user + session
 * into Hono context variables for downstream route handlers.
 *
 * - If the request has a valid session cookie/token, user and session
 *   are populated.
 * - If not, both are set to null (requests proceed without auth).
 * - Routes requiring authentication should check c.get('user') and
 *   return 401 if null.
 */
export async function sessionMiddleware(c: Context, next: Next) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    c.set('user', null);
    c.set('session', null);
    await next();
    return;
  }

  c.set('user', session.user);
  c.set('session', session.session);
  await next();
}
