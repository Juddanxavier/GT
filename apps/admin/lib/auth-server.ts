import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { admin, customSession, twoFactor } from 'better-auth/plugins';
import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements, adminAc } from 'better-auth/plugins/admin/access';
import { eq } from 'drizzle-orm';
import { getDb } from './db';
import * as schema from './schema';

const ac = createAccessControl(defaultStatements);

let _auth: ReturnType<typeof betterAuth> | null = null;

export function getAuth() {
  if (_auth) return _auth;
  const db = getDb();
  _auth = betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        ...schema,
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        twoFactor: schema.twoFactor,
      },
    }),
    advanced: {
      crossSubDomainCookies: {
        enabled: true,
        domain: '.gajantraders.com',
      },
      cookies: {
        session_token: {
          attributes: {
            sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax',
            secure: process.env.NODE_ENV === 'production',
          },
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
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
        adminRoles: ['superadmin', 'admin', 'tenant-admin'],
        ac,
        roles: {
          superadmin: adminAc,
          admin: adminAc,
          'tenant-admin': ac.newRole({ ...adminAc.statements }),
          staff: ac.newRole({}),
          customer: ac.newRole({}),
        },
      }),
      twoFactor({
        issuer: 'Gajan Traders',
        skipVerificationOnEnable: true,
        twoFactorCookieMaxAge: 600,
        totpOptions: { digits: 6, period: 30 },
        backupCodeOptions: { amount: 10, length: 10 },
      }),
      customSession(async ({ user, session }) => {
        const typedUser = user as { tenantId?: string | null; branchId?: string | null };
        let tenantName: string | null = null;
        let tenantCountry: string | null = null;
        let branchName: string | null = null;

        if (typedUser.tenantId) {
          const [tenant] = await db
            .select({ name: schema.tenants.name, country: schema.tenants.country })
            .from(schema.tenants)
            .where(eq(schema.tenants.id, typedUser.tenantId))
            .limit(1);
          if (tenant) {
            tenantName = tenant.name;
            tenantCountry = tenant.country;
          }
        }

        if (typedUser.branchId) {
          const [branch] = await db
            .select({ name: schema.branches.name })
            .from(schema.branches)
            .where(eq(schema.branches.id, typedUser.branchId))
            .limit(1);
          if (branch) branchName = branch.name;
        }

        return { user: { ...user, tenantName, tenantCountry, branchName }, session };
      }),
    ],
    trustedOrigins: [
      'http://localhost:3000',
      'http://localhost:3001',
      ...(process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()) ?? []),
    ],
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
  });
  return _auth;
}
