import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { admin, customSession, emailOTP, twoFactor } from 'better-auth/plugins';
import { adminAc, defaultRoles } from 'better-auth/plugins/admin/access';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export type AuthSchema = Record<string, any>;

export type SendEmailFn = (opts: {
  to: string;
  subject: string;
  html: string;
}) => Promise<void>;

export type BuildEmailHtmlFn = (opts: {
  title?: string;
  bodyHtml: string;
  footerText?: string;
  previewText?: string;
  companyName?: string;
}) => string;

const brandGreen = '#22c55e';

export function buildEmailHtml(content: {
  title?: string;
  bodyHtml: string;
  footerText?: string;
  previewText?: string;
  companyName?: string;
}): string {
  const company = content.companyName ?? 'Gajan Traders';
  const footer = content.footerText ?? `${company} — Automated Notification`;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${content.previewText ? `<meta name="description" content="${escapeHtml(content.previewText)}">` : ''}
  </head>
  <body style="margin:0;padding:32px 16px;background:#f0f0f0;font-family:'JetBrains Mono',Consolas,'Courier New',monospace;font-size:13px;line-height:1.6;color:#18181b">
    <table role="presentation" style="width:100%;max-width:520px;margin:0 auto;border-spacing:0">
      <tr>
        <td style="background:${brandGreen};padding:28px;border-radius:6px 6px 0 0">
          <table role="presentation" style="width:100%">
            <tr>
              <td style="vertical-align:middle;font-size:15px;font-weight:700;color:#fff;letter-spacing:-0.2px">
                ${escapeHtml(company)}
              </td>
              <td style="vertical-align:middle;text-align:right;font-size:10px;color:rgba(255,255,255,0.7);letter-spacing:0.5px;text-transform:uppercase">
                ${content.title ? escapeHtml(content.title) : 'Notification'}
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="background:#fff;padding:24px 28px">
          ${content.bodyHtml}
        </td>
      </tr>
      <tr>
        <td style="background:#fff;border-radius:0 0 6px 6px;padding:16px 28px;border-top:1px solid #e4e4e7;font-size:10px;color:#a1a1aa;text-align:center;letter-spacing:0.2px">
          ${escapeHtml(footer)}
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export type SchemaTable = {
  [key: string]: unknown;
  name: unknown;
  country: unknown;
  id: unknown;
};

export interface AuthConfigDeps {
  db: PostgresJsDatabase<any>;
  schema: AuthSchema;
  baseURL: string;
  trustedOrigins: string[];
  sendEmail: SendEmailFn;
  buildEmailHtml: BuildEmailHtmlFn;
}

export function createAuthConfig(deps: AuthConfigDeps): any {
  const { db, schema, baseURL, trustedOrigins, sendEmail, buildEmailHtml } = deps;

  return {
    database: drizzleAdapter(db, {
      provider: 'pg' as const,
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
        enabled: !!process.env.COOKIE_DOMAIN,
        domain: process.env.COOKIE_DOMAIN || undefined,
      },
      cookies: {
        session_token: {
          attributes: {
            sameSite: 'lax',
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
          type: 'string' as const,
          required: false,
          input: false,
        },
        branchId: {
          type: 'string' as const,
          required: false,
          input: false,
        },
      },
    },
    plugins: [
      admin({
        defaultRole: 'customer',
        adminRoles: ['superadmin', 'tenant-admin'],
        roles: {
          superadmin: adminAc,
          'tenant-admin': adminAc,
          staff: defaultRoles.user,
          customer: defaultRoles.user,
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
            .where(eq(schema.tenants.id as any, typedUser.tenantId))
            .limit(1) as { name: string; country: string }[];
          if (tenant) {
            tenantName = tenant.name;
            tenantCountry = tenant.country;
          }
        }

        if (typedUser.branchId) {
          const [branch] = await db
            .select({ name: schema.branches.name })
            .from(schema.branches)
            .where(eq(schema.branches.id as any, typedUser.branchId))
            .limit(1) as { name: string }[];
          if (branch) branchName = branch.name;
        }

        return { user: { ...user, tenantName, tenantCountry, branchName }, session };
      }),
    ],
    trustedOrigins,
    baseURL,
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24, // 24h
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 500,
      customRules: {
        '/sign-in/email': { window: 10, max: 3 },
        '/sign-up/email': { window: 3600, max: 5 },
        '/email-otp/request-password-reset': { window: 300, max: 3 },
        '/two-factor/verify': { window: 10, max: 3 },
        '/get-session': { window: 10, max: 100 },
      },
    },
  };
}
