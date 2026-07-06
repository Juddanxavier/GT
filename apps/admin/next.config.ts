import type { NextConfig } from 'next';

if (!process.env.NEXT_PUBLIC_API_URL) {
  console.warn('[env] NEXT_PUBLIC_API_URL not set at build time — use --build-arg or Dokploy Build Args');
}

const nextConfig: NextConfig = {
  transpilePackages: ['better-auth'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'"} https://js.sentry-cdn.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'} https://*.sentry.io ws: wss:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
