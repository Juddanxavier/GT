import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Track Your Parcel',
  description:
    'Track your Lanka Mahal parcel in real time. Enter your tracking number for live status updates from pickup to delivery worldwide.',
};

export default function TrackLayout({ children }: { children: ReactNode }): ReactNode {
  return <>{children}</>;
}
