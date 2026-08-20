import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Gajan Traders collects, uses and protects your personal information when you book and track parcels online.',
};

export default function PrivacyPolicyLayout({ children }: { children: ReactNode }): ReactNode {
  return <>{children}</>;
}
