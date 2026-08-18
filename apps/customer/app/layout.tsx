import type { ReactNode } from 'react';
import { Bricolage_Grotesque } from 'next/font/google';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage-grotesque',
});

import { GajanLayout } from '@/components/gajan/layout';
import { Providers } from '@/components/providers';

export const metadata = {
  title: {
    template: '%s — Gajan Traders',
    default: 'Gajan Traders — International Courier',
  },
};

export default async function RootLayout({ children }: { children: ReactNode }): Promise<ReactNode> {
  return (
    <html lang="en" className={bricolage.variable}>
      <body className="bg-background text-foreground antialiased" style={{ fontFamily: 'var(--font-bricolage-grotesque)' }}>
        <Providers>
          <GajanLayout>{children}</GajanLayout>
        </Providers>
      </body>
    </html>
  );
}
