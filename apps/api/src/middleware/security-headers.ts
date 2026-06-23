import type { Context, Next } from 'hono';

const isProduction = process.env.NODE_ENV === 'production';

export async function securityHeadersMiddleware(c: Context, next: Next) {
  await next();

  c.res.headers.set('X-Content-Type-Options', 'nosniff');
  c.res.headers.set('X-Frame-Options', 'DENY');
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  );
  c.res.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;",
  );

  if (isProduction) {
    c.res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}
