import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description:
    'The terms and conditions for using Gajan Traders courier services — shipment booking, prohibited items, liability and more.',
};

export default function TermsConditionsLayout({ children }: { children: ReactNode }): ReactNode {
  return <>{children}</>;
}
