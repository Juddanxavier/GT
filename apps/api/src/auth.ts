/** @format */

import { betterAuth } from 'better-auth';
import { createAuthConfig, buildEmailHtml } from '@repo/auth-config';
import { sendEmail } from './email/provider';
import { db } from './db';
import * as schema from './db/schema';

export const auth = betterAuth({
  ...createAuthConfig({
    db,
    schema: schema as any,
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
    trustedOrigins: [
      'http://localhost:3000',
      'http://localhost:3001',
      ...(process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()) ?? []),
    ],
    sendEmail,
    buildEmailHtml,
  }),
});

export type Auth = typeof auth;
