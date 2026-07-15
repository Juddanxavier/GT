import type { Context } from 'hono';

export const ErrorCode = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
  UNAUTHORIZED: 'UNAUTHORIZED',
  RATE_LIMITED: 'RATE_LIMITED',
  NOT_FOUND: 'NOT_FOUND',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
  CONFIG_ERROR: 'CONFIG_ERROR',
  BRANCH_MISMATCH: 'BRANCH_MISMATCH',
  NO_BRANCH: 'NO_BRANCH',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export function errorResponse(c: Context, code: string, message: string, status: number) {
  const requestId = c.get('requestId');
  return c.json({ error: { code, message }, requestId }, status as any);
}
