import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: {
    template: '%s — Gajan Traders',
    default: 'Gajan Traders Admin',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={jetbrainsMono.variable}>
      <body style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>{children}</body>
    </html>
  );
}
