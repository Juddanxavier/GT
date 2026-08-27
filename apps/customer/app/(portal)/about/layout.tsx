import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Gajan Traders is a trusted Indian courier delivering to 220+ countries since 2016 — with secure handling, on-time delivery and human support.',
};

export default function AboutLayout({ children }: { children: ReactNode }): ReactNode {
  return <>{children}</>;
}
