'use client';

import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { Spinner } from '@heroui/react';
import { ErrorBoundary } from '@/components/error-boundary';
import { TrackingDetail } from '@/components/tracking-detail';
import { LeftSidebar, RightSidebar } from '@/components/sidebar';

function TrackDetailPageInner(): ReactNode {
  return (
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden min-h-[300px] md:min-h-[350px] flex items-center bg-[#1a1a2e]">
        <div className="absolute inset-0">
          <img src="/images/trackbg.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e]/80 via-[#1a1a2e]/40 to-transparent" />
        </div>
        <div className="relative z-10 px-8 md:px-16 lg:px-24 w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            <span className="inline-flex items-center gap-2 text-base font-semibold uppercase tracking-[0.15em] text-[#F94735] mb-3">
              <span className="w-6 h-px bg-[#F94735]" />
              Tracking
            </span>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Track Your Shipment</h1>
            <p className="text-lg text-white/90 max-w-lg mt-2">Real-time updates for your shipment from pickup to delivery.</p>
          </motion.div>
        </div>
      </section>

      <div className="px-4 sm:px-6 lg:px-8 py-10 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-[220px_1fr_260px] gap-6">
          <LeftSidebar variant="public" />
          <main className="min-w-0">
            <TrackingDetail />
          </main>
          <RightSidebar />
        </div>
      </div>
    </div>
  );
}

export default function TrackDetailPage(): ReactNode {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><Spinner size="lg" /></div>}>
        <TrackDetailPageInner />
      </Suspense>
    </ErrorBoundary>
  );
}