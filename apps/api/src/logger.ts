import type { DestinationStream, Logger, LoggerOptions } from 'pino';
import pino from 'pino';

export type { Logger };

// ── PII masking (spec 0001, AC-6) ──
// Applied in a logMethod hook so every line is masked before serialization:
// one choke point covers both the JSON path and the pretty transport.

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const E164_RE = /\+\d{8,15}/g;
// Digits with spaces or parentheses between groups. The space/paren requirement
// is what keeps UUIDs, tracking numbers (GT-123456789) and durations in ms readable.
const SEP_PHONE_RE = /\d[\d\s()]*\d|\d/g;

function maskDigitsKeepLast4(digits: string): string {
  return '*'.repeat(Math.max(0, digits.length - 4)) + digits.slice(-4);
}

function maskString(value: string): string {
  return value
    .replace(EMAIL_RE, (m) => `${m[0]}***@${m.slice(m.indexOf('@') + 1)}`)
    .replace(E164_RE, (m) => `+${maskDigitsKeepLast4(m.slice(1))}`)
    .replace(SEP_PHONE_RE, (m) => {
      const digits = m.replace(/\D/g, '');
      if (!/[\s(]/.test(m) || digits.length < 9 || digits.length > 15) return m;
      const keepFrom = digits.length - 4;
      let seen = 0;
      return m.replace(/\d/g, (d) => (++seen <= keepFrom ? '*' : d));
    });
}

function maskValue(value: unknown): unknown {
  if (typeof value === 'string') return maskString(value);
  // Top level string fields only; arrays and nested objects pass through untouched.
  // Errors keep their prototype (message/stack are not own enumerable), so pino's
  // error serializer still sees the original object.
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    let changed = false;
    const clone: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (typeof entry === 'string') {
        const masked = maskString(entry);
        if (masked !== entry) changed = true;
        clone[key] = masked;
      } else {
        clone[key] = entry;
      }
    }
    return changed ? clone : value;
  }
  return value;
}

// ── Configuration (spec 0001, AC-4) ──
// LOG_LEVEL: single level control. VITEST: the app logger stays silent in tests.
// LOG_PRETTY=1 forces pretty anywhere, LOG_PRETTY=0 forces JSON anywhere,
// otherwise NODE_ENV decides (production gives JSON, anything else pretty).

function resolveLevel(explicit?: string): string {
  if (explicit) return explicit;
  if (process.env.VITEST) return 'silent';
  return process.env.LOG_LEVEL || 'info';
}

function resolvePretty(): boolean {
  const flag = process.env.LOG_PRETTY;
  if (flag === '1') return true;
  if (flag === '0') return false;
  return process.env.NODE_ENV !== 'production';
}

const redact = {
  paths: [
    'password', 'passwords', 'passwordHash', 'secret', 'secrets',
    'token', 'tokens', 'accessToken', 'refreshToken',
    'authorization', 'Authorization', 'cookie', 'cookies',
    'body.password', 'body.secret', 'body.token',
    'body.apiKey', 'body.api_key',
    'headers.authorization', 'headers.cookie',
  ],
  censor: '[REDACTED]',
};

export type CreateLoggerOptions = {
  level?: string;
  destination?: DestinationStream;
};

export function createLogger(options: CreateLoggerOptions = {}): Logger {
  const level = resolveLevel(options.level);
  const opts: LoggerOptions = {
    level,
    redact,
    hooks: {
      logMethod(args, method) {
        const masked = (args as unknown[]).map(maskValue);
        const fn = method as unknown as (...fnArgs: unknown[]) => void;
        fn.apply(this, masked);
      },
    },
  };
  // An explicit destination wins over formatting: tests capture raw JSON lines.
  if (level !== 'silent' && !options.destination && resolvePretty()) {
    opts.transport = {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
    };
  }
  return options.destination ? pino(opts, options.destination) : pino(opts);
}

export const logger = createLogger();

export function childLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}

export interface LoggerVariables {
  logger: Logger;
}
