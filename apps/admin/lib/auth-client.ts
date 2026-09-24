/** @format */

import { createAuthClient } from 'better-auth/react';
import { adminClient } from 'better-auth/client/plugins';

const baseURL = typeof window !== 'undefined'
  ? `${window.location.origin}/api/auth`
  : process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/auth`
    : 'http://localhost:3001/api/auth';

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    adminClient(),
  ],
});
