import type { ReactNode } from 'react';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

import { PortalNav } from '@/components/portal-nav';
import { Footer } from '@/components/footer';
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

export default async function RootLayout({ children }: { children: ReactNode }): Promise<ReactNode> {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body className="bg-background text-foreground antialiased" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
        <Providers>
          <PortalNav />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
