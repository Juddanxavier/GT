'use client';

import { Spinner } from '@heroui/react';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { PageHero } from '@/components/page/page-hero';
import { PageSection, PageShell } from '@/components/page/page-section';
import { LeftSidebar, RightSidebar } from '@/components/sidebar';
import { TrackingDetail } from '@/components/tracking-detail';

function TrackDetailPageInner(): ReactNode {
  return (
    <PageShell>
      <PageHero
        image="/images/trackbg.webp"
        eyebrow="Tracking"
        title="Track Your Shipment"
        subtitle="Real-time updates for your shipment from pickup to delivery."
      />

      <PageSection>
        <div className="grid gap-6 lg:grid-cols-[220px_1fr_260px]">
          <LeftSidebar variant="public" />
          <main className="min-w-0">
            <TrackingDetail />
          </main>
          <RightSidebar />
        </div>
      </PageSection>
    </PageShell>
  );
}

export default function TrackDetailPage(): ReactNode {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner size="lg" />
          </div>
        }
      >
        <TrackDetailPageInner />
      </Suspense>
    </ErrorBoundary>
  );
}
