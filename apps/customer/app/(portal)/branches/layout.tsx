import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Our Branches',
  description:
    'Find a Gajan Traders branch near you in Mumbai and across India for courier drop-offs, pickups and parcel support.',
};

export default function BranchesLayout({ children }: { children: ReactNode }): ReactNode {
  return <>{children}</>;
}
