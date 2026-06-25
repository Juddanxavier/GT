import type { NextConfig } from 'next';

if (!process.env.NEXT_PUBLIC_API_URL) {
  console.warn('[env] NEXT_PUBLIC_API_URL not set at build time — use --build-arg or Dokploy Build Args');
}

const nextConfig: NextConfig = {
  transpilePackages: ['better-auth'],
  typescript: { ignoreBuildErrors: true },
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
