import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Parcel Tracking',
  description:
    'Live tracking details for your Gajan Traders parcel — view current status, scan history and estimated delivery in real time.',
};

export default function TrackDetailLayout({ children }: { children: ReactNode }): ReactNode {
  return <>{children}</>;
}
