import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Volumetric Weight Calculator',
  description:
    'Calculate the volumetric or dimensional weight of your parcel with the free metric and imperial shipping weight calculator from Lanka Mahal.',
};

export default function VolumetricCalculatorLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return <>{children}</>;
}
