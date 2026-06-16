import * as Sentry from '@sentry/hono/node';

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    environment: process.env.NODE_ENV ?? 'development',
    enabled: !!SENTRY_DSN,
  });
  console.log('[sentry] initialized');
} else {
  console.log('[sentry] disabled — SENTRY_DSN not set');
}
