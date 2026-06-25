/** @format */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { admin, customSession, emailOTP, twoFactor } from 'better-auth/plugins';
import { sendEmail } from './email/provider';
import { buildEmailHtml } from './email/build-html';
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
          sameSite: 'Lax',
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
    emailOTP({
      disableSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        const subject =
          type === 'sign-in'
            ? 'Sign-in verification code'
            : type === 'email-verification'
              ? 'Verify your email'
              : 'Reset your password';

        const title =
          type === 'sign-in'
            ? 'Sign In'
            : type === 'email-verification'
              ? 'Verify Email'
              : 'Reset Password';

        await sendEmail({
          to: email,
          subject,
          html: buildEmailHtml({
            title,
            bodyHtml: `<table role="presentation" style="width:100%">
              <tr>
                <td style="text-align:center;padding-bottom:20px">
                  <p style="font-size:13px;margin:0 0 6px;color:#52525b">Your verification code</p>
                  <div style="background:#f4f4f5;border-radius:8px;padding:16px;font-size:32px;letter-spacing:8px;font-weight:700;color:#18181b;display:inline-block">${otp}</div>
                </td>
              </tr>
              <tr>
                <td>
                  <p style="font-size:11px;margin:0;color:#a1a1aa;text-align:center">This code expires in 5 minutes. If you didn't request this, you can safely ignore this email.</p>
                </td>
              </tr>
            </table>`,
          }),
        });
      },
    }),
    twoFactor({
      issuer: 'Gajan Traders',
      skipVerificationOnEnable: true,
      twoFactorCookieMaxAge: 600,
      totpOptions: { digits: 6, period: 30 },
      backupCodeOptions: { amount: 10, length: 10 },
      otpOptions: {
        digits: 6,
        period: 5,
        async sendOTP({ user, otp }) {
          await sendEmail({
            to: user.email,
            subject: 'Your 2FA verification code',
            html: buildEmailHtml({
              title: 'Two-Factor Authentication',
              bodyHtml: `<table role="presentation" style="width:100%">
                <tr>
                  <td style="text-align:center;padding-bottom:20px">
                    <p style="font-size:13px;margin:0 0 6px;color:#52525b">Your 2FA verification code</p>
                    <div style="background:#f4f4f5;border-radius:8px;padding:16px;font-size:32px;letter-spacing:8px;font-weight:700;color:#18181b;display:inline-block">${otp}</div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="font-size:11px;margin:0;color:#a1a1aa;text-align:center">This code expires in 5 minutes. If you didn't request this, you can safely ignore this email.</p>
                  </td>
                </tr>
              </table>`,
            }),
          });
        },
      },
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
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 10, max: 3 },
      '/sign-up/email': { window: 3600, max: 5 },
      '/email-otp/request-password-reset': { window: 300, max: 3 },
      '/two-factor/verify': { window: 10, max: 3 },
      '/get-session': { window: 10, max: 20 },
    },
  },
});

export type Auth = typeof auth;
