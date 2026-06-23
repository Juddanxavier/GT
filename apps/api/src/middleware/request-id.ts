import { randomUUID } from 'node:crypto';
import type { Context, Next } from 'hono';

export type RequestIdVariables = {
  requestId: string;
};

export async function requestIdMiddleware(c: Context, next: Next) {
  const requestId = c.req.header('x-request-id') ?? randomUUID();
  c.set('requestId', requestId);
  c.res.headers.set('x-request-id', requestId);
  await next();
}
