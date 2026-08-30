import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Trusted by families and businesses across Chennai since 2015. Walk in with a parcel — we handle packing, customs, and delivery to 220+ countries with real-time tracking and personal support.',
};

export default function AboutLayout({ children }: { children: ReactNode }): ReactNode {
  return <>{children}</>;
}
