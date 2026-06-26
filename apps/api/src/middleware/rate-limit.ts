import type { Context, Next } from 'hono';
import { cacheClient } from '../redis';

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

function getLimit(method: string, path: string): RateLimitConfig {
  const routeKey = `${method}:${path}`;
  for (const [pattern, config] of Object.entries(defaultLimits)) {
    if (routeKey.startsWith(pattern.replace('*', ''))) return config;
  }
  return defaultLimits.default!;
}

export function globalRateLimit(config?: Partial<RateLimitConfig>) {
  return async function rateLimitMiddleware(c: Context, next: Next) {
    // Auth routes have their own rate limiting via Better Auth
    if (c.req.path.startsWith('/api/auth/')) {
      await next();
      return;
    }

    if (!cacheClient) {
      await next();
      return;
    }

    const user = c.get('user') as { id?: string } | null;
    const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown';
    const identifier = user?.id ?? ip;

    const method = c.req.method;
    const path = c.req.path;
    const routeConfig = getLimit(method, path);
    const merged: RateLimitConfig = { ...routeConfig, ...config };

    const key = `${merged.keyPrefix ?? 'ratelimit'}:${identifier}:${method}:${path}`;

    try {
      const count = await cacheClient.incr(key);
      if (count === 1) {
        await cacheClient.expire(key, merged.windowSeconds);
      }

      c.res.headers.set('X-RateLimit-Limit', String(merged.maxRequests));
      c.res.headers.set('X-RateLimit-Remaining', String(Math.max(0, merged.maxRequests - count)));

      if (count > merged.maxRequests) {
        return c.json({ error: 'Too many requests. Please try again later.' }, 429);
      }
    } catch {
      console.warn('[ratelimit] Redis error — proceeding without rate limit');
    }

    await next();
  };
}
