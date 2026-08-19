import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { PublicLanding } from '@/components/public-landing';

export const metadata: Metadata = {
  title: 'Ship to Europe & Worldwide from Sri Lanka',
  description:
    'Ship parcels to Europe and 200+ destinations worldwide with Lanka Mahal. Express air freight, ocean freight, doorstep pickup and real-time tracking.',
};

export default function HomePage(): ReactNode {
  return (
    <ErrorBoundary>
      <PublicLanding />
    </ErrorBoundary>
  );
}
