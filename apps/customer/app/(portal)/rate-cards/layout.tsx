import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Rate Cards — Shipping Rates by Destination',
  description:
    'View international courier rate cards by destination country. Compare express, economy, and ocean freight rates from Gajan Traders.',
};

export default function RateCardsLayout({ children }: { children: ReactNode }): ReactNode {
  return <>{children}</>;
}
