'use client';

import { ArrowLeft, PackageSearch } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { useTenantConfig } from '@/lib/use-tenant-config';

export default function NotFound(): ReactNode {
  const config = useTenantConfig();

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-brand-navy">
      <div className="absolute inset-0">
        <Image
          src="/images/heroparcel.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-navy/80 via-brand-navy/95 to-brand-navy" />
      </div>

      <div className="relative z-10 text-center px-6 py-24">
        <div className="w-16 h-16 rounded-2xl bg-brand-accent/10 text-brand-accent flex items-center justify-center mx-auto mb-8">
          <PackageSearch size={30} />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent mb-4">404</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white max-w-lg mx-auto leading-[1.15]">
          This page seems to have lost its way.
        </h1>
        <p className="mt-4 text-base text-white/70 max-w-md mx-auto leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you
          back on track.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href="/" className="premium-btn gap-2">
            <ArrowLeft size={14} /> Back to Home
          </a>
          <a
            href="/track"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/25 bg-white/[0.06] text-white text-sm font-semibold hover:bg-white/10 transition-colors"
          >
            Track a Shipment
          </a>
        </div>
        <p className="mt-10 text-xs text-white/40">
          {config.name} — International Courier Services
        </p>
      </div>
    </div>
  );
}
