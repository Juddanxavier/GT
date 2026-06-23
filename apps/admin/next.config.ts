import type { NextConfig } from 'next';

const required = ['NEXT_PUBLIC_API_URL'] as const;
for (const key of required) {
  if (!process.env[key]) {
    if (process.env.VERCEL) {
      console.warn(`[env] ${key} not set — configure in Vercel dashboard`);
    } else {
      throw new Error(`Missing required env var: ${key}`);
    }
  }
}

const nextConfig: NextConfig = {
  transpilePackages: ['better-auth'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;
