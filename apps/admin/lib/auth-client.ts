/** @format */

import { createAuthClient } from 'better-auth/react';
import { adminClient } from 'better-auth/client/plugins';

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const authClient = createAuthClient({
  baseURL: `${apiBase}/api/auth`,
  fetchOptions: {
    async customFetchImpl(url, init) {
      if (typeof window !== 'undefined') {
        const parsed = new URL(url.toString());
        const proxied = `${window.location.origin}/api/auth${parsed.pathname.replace(/^\/api\/auth/, '')}${parsed.search}`;
        return fetch(proxied, init);
      }
      return fetch(url, init);
    },
  },
  plugins: [
    adminClient(),
  ],
});
