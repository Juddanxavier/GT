import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Claim Your Shipment',
  description:
    'File a shipment claim with Gajan Traders for lost or delayed parcels. Verify your tracking number and submit your claim online.',
};

export default function ClaimLayout({ children }: { children: ReactNode }): ReactNode {
  return <>{children}</>;
}
