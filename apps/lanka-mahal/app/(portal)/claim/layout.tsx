import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Claim Your Parcel',
  description:
    'File a parcel claim with Lanka Mahal for lost or delayed parcels. Verify your tracking number and submit your claim online.',
};

export default function ClaimLayout({ children }: { children: ReactNode }): ReactNode {
  return <>{children}</>;
}
