/** @format */

import type { Context } from 'hono';
import { auth } from '../auth';
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

export async function signInHandler(c: Context) {
  const email = await extractEmail(c);

  if (email && cacheClient) {
    try {
      const locked = await cacheClient.get(`lockout:${email}`);
      if (locked) {
        const ttl = await cacheClient.ttl(`lockout:${email}`);
        await logAudit('LOGIN_BLOCKED', null, { email, remainingSeconds: ttl }, c);
        return c.json(
          {
            error: `Account locked due to too many failed attempts. Try again in ${Math.ceil(ttl / 60)} minutes.`,
          },
          423,
        );
      }
    } catch (err) {
      console.warn('[lockout] Redis error during lockout check — allowing:', (err as Error).message);
    }
  }

  let res = await auth.handler(c.req.raw);

  if (email && cacheClient) {
    try {
      if (res.status === 200) {
        await cacheClient.del(`lockout:${email}`);
        await cacheClient.del(`attempts:${email}`);
        await logAudit('LOGIN_SUCCESS', null, { email }, c);
        const oldHeaders = new Headers(res.headers);
        if (c.req.url.startsWith('https://')) {
          appendClearCookie(oldHeaders, '__Secure-better-auth.session_token');
          appendClearCookie(oldHeaders, 'better-auth.session_token');
          res = new Response(res.body, { status: res.status, statusText: res.statusText, headers: oldHeaders });
        }
      } else if (res.status === 401) {
        const attempts = await cacheClient.incr(`attempts:${email}`);
        if (attempts === 1) {
          await cacheClient.expire(`attempts:${email}`, ATTEMPT_WINDOW_SECONDS);
        }
        await logAudit('LOGIN_FAILED', null, { email, attempts: `${attempts}/${MAX_ATTEMPTS}` }, c);
        if (attempts >= MAX_ATTEMPTS) {
          await cacheClient.setex(`lockout:${email}`, LOCKOUT_SECONDS, '1');
          await logAudit('USER_BANNED', null, { email, reason: `${MAX_ATTEMPTS} failed attempts - locked 30m` }, c);
        }
      }
    } catch (err) {
      console.warn('[lockout] Redis error during attempt tracking:', (err as Error).message);
    }
  }

  return res;
}
