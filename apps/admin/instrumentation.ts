import * as Sentry from '@sentry/nextjs';

export function register() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 0.1,
      environment: process.env.NODE_ENV ?? 'development',
    });
  }
}
