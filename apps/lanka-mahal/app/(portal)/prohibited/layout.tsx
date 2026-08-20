import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Prohibited & Restricted Items',
  description:
    'Check what you can and cannot send with Lanka Mahal — currency, hazardous goods, valuables, liquids and other restricted items.',
};

export default function ProhibitedLayout({ children }: { children: ReactNode }): ReactNode {
  return <>{children}</>;
}
