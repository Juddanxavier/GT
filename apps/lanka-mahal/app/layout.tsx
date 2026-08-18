import { Manrope } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

import { Footer } from '@/components/footer';
import { PortalNav } from '@/components/portal-nav';
import { Providers } from '@/components/providers';

export const metadata = {
  title: {
    template: '%s - Lanka Mahal',
    default: 'Lanka Mahal — International Courier',
  },
  icons: {
    icon: '/images/logo.png',
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
          <PortalNav />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
