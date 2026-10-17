import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
});

export const metadata: Metadata = {
  title: {
    template: '%s — Gajan Traders',
    default: 'Gajan Traders Admin',
  },
  description: 'Gajan Traders Admin',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" className={`${jakartaSans.variable} ${plexMono.variable}`}>
      <body style={{ fontFamily: 'var(--font-sans)' }}>{children}</body>
    </html>
  );
}
