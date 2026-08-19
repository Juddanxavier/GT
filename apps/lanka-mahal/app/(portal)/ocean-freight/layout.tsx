import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Ocean Freight to Europe & Sea Cargo',
  description:
    'Economical ocean freight from Sri Lanka to Europe and worldwide ports with LCL and FCL options. Compare transit times and rates with Lanka Mahal.',
};

export default function OceanFreightLayout({ children }: { children: ReactNode }): ReactNode {
  return <>{children}</>;
}
