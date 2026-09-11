'use client';

import type { ReactNode } from 'react';
import { Suspense, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ErrorBoundary } from '@/components/error-boundary';
import { PageHero } from '@/components/page/page-hero';
import { PageSection, PageShell } from '@/components/page/page-section';
import { TrackSidebar } from '@/components/track/track-sidebar';
import { TrackingDetail } from '@/components/tracking-detail';

function TrackDetailContent(): ReactNode {
  const params = useParams();
  const router = useRouter();
  const trackingNo = params.trackingNo as string;
  const [searchValue, setSearchValue] = useState('');

  return (
    <PageShell>
      <PageHero
        image="/images/trackbg.webp"
        eyebrow="Shipment tracking"
        title={<span className="font-mono">{trackingNo}</span>}
        subtitle="Live status and full tracking history below."
      />

      <PageSection>
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10 xl:gap-12">
          <div className="order-2 lg:order-1 lg:col-span-4">
            <TrackSidebar
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              onSearchSubmit={(v) => router.push(`/track/${encodeURIComponent(v)}`)}
              searchTitle="Track another"
              searchPlaceholder="Another tracking number"
            />
          </div>

          <div className="order-1 lg:order-2 lg:col-span-8">
            <TrackingDetail hideBack />
          </div>
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
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-accent/20 border-t-brand-accent" />
          </div>
        }
      >
        <TrackDetailContent />
      </Suspense>
    </ErrorBoundary>
  );
}
