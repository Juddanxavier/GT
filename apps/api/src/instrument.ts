import * as Sentry from '@sentry/hono/node';
import { logger } from './logger';

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 0.1,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : undefined,
    environment: process.env.NODE_ENV ?? 'development',
    enabled: !!SENTRY_DSN,
  } as Parameters<typeof Sentry.init>[0]);
  logger.info('sentry initialized');
} else {
  logger.info('sentry disabled: SENTRY_DSN not set');
}
