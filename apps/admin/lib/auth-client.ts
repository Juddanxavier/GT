/** @format */

import { createAuthClient } from 'better-auth/react';
import { adminClient } from 'better-auth/client/plugins';

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined'
    ? '/api/auth'
    : `${apiBase}/api/auth`,
  plugins: [
    adminClient(),
  ],
});
