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
  metadataBase: new URL('https://lankamahal.lk'),
  title: {
    template: '%s - Lanka Mahal',
    default: 'Lanka Mahal — International Courier',
  },
  description:
    'Lanka Mahal international courier — express air freight and ocean freight from Sri Lanka to Europe and 200+ destinations with doorstep pickup and real-time tracking.',
  keywords: [
    'Lanka Mahal',
    'international courier Sri Lanka',
    'parcel from Sri Lanka',
    'parcels to Europe',
    'courier to Europe',
    'parcel delivery',
    'air freight Sri Lanka',
    'ocean freight',
    'courier service Colombo',
    'track parcel',
    'doorstep pickup',
  ],
  openGraph: {
    title: 'Lanka Mahal — International Courier',
    description:
      'Express air freight and ocean freight from Sri Lanka to Europe and 200+ destinations, with doorstep pickup and real-time tracking.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Lanka Mahal',
    images: [{ url: '/images/logo.webp' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lanka Mahal — International Courier',
    description:
      'Express air freight and ocean freight from Sri Lanka to Europe and 200+ destinations, with doorstep pickup and real-time tracking.',
    images: ['/images/logo.webp'],
  },
  icons: {
    icon: '/images/logo.webp',
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
