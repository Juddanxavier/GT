/** @format */

import { betterAuth } from 'better-auth';
import { createAuthConfig, buildEmailHtml, type AuthSchema } from '@repo/auth-config';
import { sendEmail } from './email/provider';
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
      'http://localhost:3000',
      'http://localhost:3001',
      'https://admin.gajantraders.com',
      'https://api.gajantraders.com',
      'https://gajantraders.com',
      'https://www.gajantraders.com',
      ...(process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()) ?? []),
    ],
    sendEmail,
    buildEmailHtml,
    logAudit,
  }),
});

export type Auth = typeof auth;
