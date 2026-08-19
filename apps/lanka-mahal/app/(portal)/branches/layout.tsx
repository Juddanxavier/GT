import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Our Branches',
  description:
    'Find a Lanka Mahal branch near you in Colombo, Jaffna and across Sri Lanka for courier drop-offs, pickups and shipping support.',
};

export default function BranchesLayout({ children }: { children: ReactNode }): ReactNode {
  return <>{children}</>;
}
