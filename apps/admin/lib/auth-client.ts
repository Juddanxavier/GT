/** @format */

import { createAuthClient } from 'better-auth/react';
import { adminClient, emailOTPClient, twoFactorClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
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
