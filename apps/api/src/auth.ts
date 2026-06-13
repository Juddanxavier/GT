/** @format */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { db } from './db';
import * as schema from './db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      ...schema,
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },
  user: {
    additionalFields: {
      tenantId: {
        type: 'string',
        required: false,
        input: false,
      },
      role: {
        type: 'string',
        required: true,
        defaultValue: 'customer',
        input: false,
      },
      branchId: {
        type: 'string',
        required: false,
        input: false,
      },
    },
  },
  trustedOrigins: [
    'http://localhost:3000', // Admin app dev
    'http://localhost:3001', // API self (for server-side calls)
  ],
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
    },
    defaultCookieAttributes: {
      sameSite: 'lax',
      secure: false, // Set to true in production with HTTPS
    },
  },
  // CSRF protection is enabled by default
  // Session refresh rotation is enabled by default (1/3 through lifetime)
});

export type Auth = typeof auth;
