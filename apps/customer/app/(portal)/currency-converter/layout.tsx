import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Currency Converter',
  description:
    'Convert major world currencies — USD, GBP, EUR, AED, SAR, INR and more — with the free currency converter from Gajan Traders.',
};

export default function CurrencyConverterLayout({ children }: { children: ReactNode }): ReactNode {
  return <>{children}</>;
}
