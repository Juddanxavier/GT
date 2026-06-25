import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { createAuthConfig, buildEmailHtml } from '@repo/auth-config';
import { sendEmail } from './email/provider';
import { getDb } from './db';
import * as schema from './schema';

let _auth: ReturnType<typeof betterAuth> | null = null;

export function getAuth() {
  if (_auth) return _auth;
  const db = getDb();
  const config = createAuthConfig({
    db,
    schema: schema as any,
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
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
  });
  config.plugins.push(nextCookies());
  _auth = betterAuth(config);
  return _auth;
}
