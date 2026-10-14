import type { Context, Next } from 'hono';
import { cacheClient } from '../redis';
import { errorResponse } from '../error-response';

export type RateLimitConfig = {
  windowSeconds: number;
  maxRequests: number;
  keyPrefix?: string;
};

const defaultLimits: Record<string, RateLimitConfig> = {
  default: { windowSeconds: 60, maxRequests: 60 },
  'POST:/api/shipments': { windowSeconds: 3600, maxRequests: 30 },
  'POST:/api/invoices/shipment': { windowSeconds: 3600, maxRequests: 30 },
};

const fallbackStore = new Map<string, { count: number; resetAt: number }>();

function getLimit(method: string, path: string): RateLimitConfig {
  const routeKey = `${method}:${path}`;
  for (const [pattern, config] of Object.entries(defaultLimits)) {
    if (routeKey.startsWith(pattern.replace('*', ''))) return config;
  }
  return defaultLimits.default!;
}

export function globalRateLimit(config?: Partial<RateLimitConfig>) {
  return async function rateLimitMiddleware(c: Context, next: Next) {
    if (c.req.path.startsWith('/api/auth/')) {
      await next();
      return;
    }

    const user = c.get('user') as { id?: string; tenantId?: string } | null;
    const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown';
    const identifier = user?.id ?? ip;
    const tenantId = c.get('tenantId');

    const method = c.req.method;
    const path = c.req.path;
    const routeConfig = getLimit(method, path);
    const merged: RateLimitConfig = { ...routeConfig, ...config };

    if (!cacheClient) {
      const now = Date.now();
      const fallbackKey = `${merged.keyPrefix ?? 'ratelimit'}:${method}:${path}:${identifier}`;
      const entry = fallbackStore.get(fallbackKey);
      if (entry && entry.resetAt > now) {
        if (entry.count >= merged.maxRequests) {
          return errorResponse(c, 'RATE_LIMITED', 'Too many requests. Please try again later.', 429);
        }
        entry.count++;
      } else {
        fallbackStore.set(fallbackKey, { count: 1, resetAt: now + merged.windowSeconds * 1000 });
      }
      c.res.headers.set('X-RateLimit-Limit', String(merged.maxRequests));
      c.res.headers.set('X-RateLimit-Remaining', String(Math.max(0, merged.maxRequests - (fallbackStore.get(fallbackKey)?.count ?? 1))));
      await next();
      return;
    }

    const sanitize = (s: string) => s.replace(/[\s:;]+/g, '_').replace(/[^a-zA-Z0-9_\-.:@]/g, '');
    const safeIdentifier = sanitize(identifier);
    const safePrefix = sanitize(merged.keyPrefix ?? 'ratelimit');
    const tenantSegment = tenantId ? `${sanitize(tenantId)}:` : '';
    const key = `${safePrefix}:${tenantSegment}${safeIdentifier}:${method}:${path}`;

    try {
      const rawCount = await cacheClient.incr(key);
      const count = typeof rawCount === 'number' ? rawCount : 1;
      if (count === 1) {
        await cacheClient.expire(key, merged.windowSeconds);
      }

      c.res.headers.set('X-RateLimit-Limit', String(merged.maxRequests));
      c.res.headers.set('X-RateLimit-Remaining', String(Math.max(0, merged.maxRequests - count)));

      if (count > merged.maxRequests) {
        return errorResponse(c, 'RATE_LIMITED', 'Too many requests. Please try again later.', 429);
      }
    } catch (err) {
      c.get('logger').error({ err }, 'rate limit redis operation failed, bypassing for this request');
    }

    await next();
  };
}
