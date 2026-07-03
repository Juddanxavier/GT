import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});
import { getTenantSlug } from '@/lib/tenant';
import { GajanLayout } from '@/components/gajan/layout';
import { LankaLayout } from '@/components/lanka/layout';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: {
    template: '%s — Gajan Traders / Lanka Mahal',
    default: 'Track Your Shipment',
  },
};

export default async function RootLayout({ children }: { children: ReactNode }): Promise<ReactNode> {
  const slug = await getTenantSlug();

  return (
    <html lang="en" data-tenant-slug={slug} className={jetbrainsMono.variable}>
      <body className="bg-white text-gray-900 antialiased" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
        <Providers>
          {slug === 'lanka-mahal' ? (
            <LankaLayout>{children}</LankaLayout>
          ) : (
            <GajanLayout>{children}</GajanLayout>
          )}
        </Providers>
      </body>
    </html>
  );
}
