import { randomUUID } from 'node:crypto';
import type { Context, Next } from 'hono';

export type RequestIdVariables = {
  requestId: string;
};

// Inbound ids are caller supplied (spec 0001): at most 128 characters from
// [A-Za-z0-9._-], anything else replaced with a fresh UUID so one id stays greppable.
const INBOUND_ID_RE = /^[A-Za-z0-9._-]{1,128}$/;

export async function requestIdMiddleware(c: Context, next: Next) {
  const header = c.req.header('x-request-id');
  const requestId = header && INBOUND_ID_RE.test(header) ? header : randomUUID();
  c.set('requestId', requestId);
  c.res.headers.set('x-request-id', requestId);
  await next();
}
