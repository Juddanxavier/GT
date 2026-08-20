import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

import { GajanLayout } from '@/components/gajan/layout';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  metadataBase: new URL('https://gajantraders.com'),
  title: {
    template: '%s — Gajan Traders',
    default: 'Gajan Traders — International Courier',
  },
  description:
    'Gajan Traders international courier — express air freight and ocean freight from India to Europe and 200+ destinations with doorstep pickup and real-time tracking.',
  keywords: [
    'Gajan Traders',
    'international courier India',
    'parcel from India',
    'parcels to Europe',
    'courier to Europe',
    'parcel delivery',
    'air freight India',
    'ocean freight',
    'courier service Mumbai',
    'track parcel',
    'doorstep pickup',
  ],
  openGraph: {
    title: 'Gajan Traders — International Courier',
    description:
      'Express air freight and ocean freight from India to Europe and 200+ destinations, with doorstep pickup and real-time tracking.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Gajan Traders',
    images: [{ url: '/images/hero.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gajan Traders — International Courier',
    description:
      'Express air freight and ocean freight from India to Europe and 200+ destinations, with doorstep pickup and real-time tracking.',
    images: ['/images/hero.png'],
  },
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  return (
    <html lang="en" className={manrope.variable}>
      <body
        className="bg-background text-foreground antialiased"
        style={{ fontFamily: 'var(--font-manrope)' }}
      >
        <Providers>
          <GajanLayout>{children}</GajanLayout>
        </Providers>
      </body>
    </html>
  );
}
