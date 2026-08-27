'use client';

import { Spinner } from '@heroui/react';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { TrackingDetail } from '@/components/tracking-detail';

export default function MyShipmentDetailPage(): ReactNode {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[40vh]">
            <Spinner size="lg" />
          </div>
        }
      >
        <TrackingDetail />
      </Suspense>
    </ErrorBoundary>
  );
}
