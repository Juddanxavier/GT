import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { PublicLanding } from '@/components/public-landing';

export const metadata: Metadata = {
  title: 'Track Your Parcel — Live Shipment Status',
  description:
    'Track your Gajan Traders shipment in real time. Enter your tracking number for instant updates on parcels from India to 220+ countries worldwide.',
};

export default function HomePage(): ReactNode {
  return (
    <ErrorBoundary>
      <PublicLanding />
    </ErrorBoundary>
  );
}
