/** @format */

import { betterAuth } from 'better-auth';
import { createAuthConfig, buildEmailHtml, type AuthSchema } from '@repo/auth-config';
import { sendEmail } from './email/provider';
import { logger } from './logger';
import { db } from './db';
import * as schema from './db/schema';
import { logAudit as logAuditImpl } from './services/audit';

const logAudit: (
  event: string,
  userId: string | null,
  metadata?: Record<string, unknown>,
) => Promise<void> = logAuditImpl as (
  event: string,
  userId: string | null,
  metadata?: Record<string, unknown>,
) => Promise<void>;

export const auth = betterAuth({
  ...createAuthConfig({
    db,
    schema: schema as AuthSchema,
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
    trustedOrigins: [
      // Environment-aware: only the relevant origins for the current environment
      // plus any explicit overrides via CORS_ORIGIN env var
      ...(process.env.NODE_ENV === 'production'
        ? [
            'https://admin.gajantraders.com',
            'https://api.gajantraders.com',
            'https://gajantraders.com',
            'https://www.gajantraders.com',
            'https://lankamahal.lk',
            'https://www.lankamahal.lk',
          ]
        : [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3002',
          ]
      ),
      ...(process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()) ?? []),
    ],
    sendEmail: (opts) => sendEmail(opts, logger),
    buildEmailHtml,
    logAudit,
  }),
});

export type Auth = typeof auth;
