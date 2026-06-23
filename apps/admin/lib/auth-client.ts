/** @format */

import { createAuthClient } from 'better-auth/react';
import { adminClient, emailOTPClient, twoFactorClient } from 'better-auth/client/plugins';

// ponytail: explicit any avoids TS 5.9 zod internal ref issue in build
export const authClient: any = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  plugins: [
    adminClient(),
    emailOTPClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.href = '/2fa';
      },
    }),
  ],
});
