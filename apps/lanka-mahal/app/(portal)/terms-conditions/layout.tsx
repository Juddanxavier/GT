import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description:
    'The terms and conditions for using Lanka Mahal courier services — parcel booking, prohibited items, liability and more.',
};

export default function TermsConditionsLayout({ children }: { children: ReactNode }): ReactNode {
  return <>{children}</>;
}
