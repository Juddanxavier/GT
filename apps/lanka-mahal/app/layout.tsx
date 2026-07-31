import type { ReactNode } from 'react';
import { Bricolage_Grotesque } from 'next/font/google';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage-grotesque',
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
    <html lang="en" className={bricolage.variable}>
      <body className="bg-background text-foreground antialiased overflow-x-hidden" style={{ fontFamily: 'var(--font-bricolage-grotesque)' }}>
        <Providers>
          <PortalNav />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
