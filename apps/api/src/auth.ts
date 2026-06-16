/** @format */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { admin, customSession } from 'better-auth/plugins';
import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements, adminAc } from 'better-auth/plugins/admin/access';
import { eq } from 'drizzle-orm';
import { db } from './db';
import * as schema from './db/schema';

const ac = createAccessControl(defaultStatements);

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
      branchId: {
        type: 'string',
        required: false,
        input: false,
      },
    },
  },
  plugins: [
    admin({
      defaultRole: 'customer',
      ac,
      roles: {
        superadmin: adminAc,
        admin: adminAc,
        'tenant-admin': ac.newRole({ ...adminAc.statements }),
        staff: ac.newRole({}),
        customer: ac.newRole({}),
      },
    }),
    customSession(async ({ user, session }) => {
      const typedUser = user as { tenantId?: string | null; branchId?: string | null };
      let tenantName: string | null = null;
      let branchName: string | null = null;

      if (typedUser.tenantId) {
        const [tenant] = await db
          .select({ name: schema.tenants.name })
          .from(schema.tenants)
          .where(eq(schema.tenants.id, typedUser.tenantId))
          .limit(1);
        if (tenant) tenantName = tenant.name;
      }

      if (typedUser.branchId) {
        const [branch] = await db
          .select({ name: schema.branches.name })
          .from(schema.branches)
          .where(eq(schema.branches.id, typedUser.branchId))
          .limit(1);
        if (branch) branchName = branch.name;
      }

      return { user: { ...user, tenantName, branchName }, session };
    }),
  ],
  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
    },
    defaultCookieAttributes: {
      sameSite: 'lax',
      secure: false,
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 10, max: 3 },
      '/sign-up/email': { window: 3600, max: 5 },
      '/two-factor/verify': { window: 10, max: 3 },
      '/get-session': false,
    },
  },
});

export type Auth = typeof auth;
