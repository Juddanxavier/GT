import type { Context } from 'hono';

export function errorResponse(c: Context, code: string, message: string, status: number) {
  const requestId = c.get('requestId');
  return c.json({ error: { code, message }, requestId }, status as any);
}
