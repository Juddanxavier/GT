import type { Logger } from 'pino';
import pino from 'pino';

export type { Logger };

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
        },
      }
    : {}),
  redact: {
    paths: [
      'password', 'passwords', 'passwordHash', 'secret', 'secrets',
      'token', 'tokens', 'accessToken', 'refreshToken',
      'authorization', 'Authorization', 'cookie', 'cookies',
      'body.password', 'body.secret', 'body.token',
      'body.apiKey', 'body.api_key',
      'headers.authorization', 'headers.cookie',
    ],
    censor: '[REDACTED]',
  },
});

export function childLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}

export interface LoggerVariables {
  logger: Logger;
}
