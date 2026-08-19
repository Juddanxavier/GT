import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Shipment Tracking',
  description:
    'Live tracking details for your Lanka Mahal shipment — view current status, scan history and estimated delivery in real time.',
};

export default function TrackDetailLayout({ children }: { children: ReactNode }): ReactNode {
  return <>{children}</>;
}
