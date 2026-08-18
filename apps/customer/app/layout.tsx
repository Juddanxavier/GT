import { Manrope } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

import { GajanLayout } from '@/components/gajan/layout';
import { Providers } from '@/components/providers';

export const metadata = {
  title: {
    template: '%s — Gajan Traders',
    default: 'Gajan Traders — International Courier',
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
