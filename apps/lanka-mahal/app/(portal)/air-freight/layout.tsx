import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Air Freight to Europe & Express Parcel Delivery',
  description:
    'Fast air freight from Sri Lanka to Europe and 200+ destinations with 3–15 day express delivery. Book express parcel and document delivery with Lanka Mahal.',
};

export default function AirFreightLayout({ children }: { children: ReactNode }): ReactNode {
  return <>{children}</>;
}
