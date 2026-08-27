'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  CalendarClock,
  FileText,
  PackageSearch,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTenantConfig } from '@/lib/use-tenant-config';

const TILES = [
  {
    id: 'track',
    icon: PackageSearch,
    title: 'Track Shipment',
    description: 'Real-time status on any shipment, no login needed.',
    span: 'col-span-2',
    interactive: true,
  },
  {
    id: 'pickup',
    icon: CalendarClock,
    title: 'Schedule Pickup',
    description: 'Pickup within 3 km of our offices.',
    href: '/pickup',
    span: 'col-span-1',
  },
  {
    id: 'customs',
    icon: ShieldCheck,
    title: 'Customs Support',
    description: 'Hassle-free clearance for every destination.',
    span: 'col-span-1',
  },
  {
    id: 'invoice',
    icon: FileText,
    title: 'View Invoices',
    description: 'Download & manage billing in one place.',
    href: '/my-invoices',
    span: 'col-span-1',
  },
  {
    id: 'delivery',
    icon: Truck,
    title: 'Door-to-Door',
    description: "From pickup to your recipient's doorstep.",
    span: 'col-span-1',
  },
] as const;

export function ServicesSection(): ReactNode {
  const config = useTenantConfig();
  const router = useRouter();
  const [trackingNo, setTrackingNo] = useState('');

  function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingNo.trim()) return;
    router.push(`/track/${encodeURIComponent(trackingNo.trim())}`);
  }

  return (
    <section
      id="services"
      className="relative overflow-hidden bg-gradient-to-br from-[#fffbeb] via-white to-[#fef3c7]"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-5 py-16 sm:px-8 md:px-16 md:py-24 lg:px-24">
        <div className="mb-10 text-center">
          <span className="inline-flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#F59E0B]">
            <span className="h-px w-6 bg-[#F59E0B]" />
            Quick Services
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {config.services.title}
          </h2>
          <p className="mt-2 text-base text-foreground/65">{config.services.subtitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {TILES.map((tile, i) => {
            const Icon = tile.icon;
            const isTrack = tile.id === 'track';

            return (
              <motion.div
                key={tile.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className={`${tile.span} group relative flex flex-col justify-between rounded-2xl border border-border/60 ${isTrack ? 'bg-[repeating-linear-gradient(135deg,transparent,transparent_10px,rgba(245,158,11,0.04)_10px,rgba(245,158,11,0.04)_20px)]' : 'bg-white'} p-6 transition-shadow hover:shadow-lg ${isTrack ? 'md:p-8' : ''}`}
              >
                <div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F59E0B]/10 transition-colors group-hover:bg-[#F59E0B]/20">
                    <Icon size={20} className="text-[#F59E0B]" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-foreground">{tile.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/60">
                    {tile.description}
                  </p>
                </div>

                {isTrack && (
                  <form onSubmit={handleTrack} className="mt-6">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={trackingNo}
                        onChange={(e) => setTrackingNo(e.target.value)}
                        placeholder="Enter tracking number"
                        aria-label="Tracking number"
                        className="h-11 w-full flex-1 rounded-xl border border-border bg-white px-4 text-sm text-foreground outline-none placeholder:text-foreground/30 focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20"
                      />
                      <button
                        type="submit"
                        disabled={!trackingNo.trim()}
                        className="flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#F59E0B] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#D97706] disabled:opacity-50 sm:w-auto"
                      >
                        Track <ArrowRight size={14} />
                      </button>
                    </div>
                  </form>
                )}

                {!isTrack && (tile as { href?: string }).href && (
                  <a
                    href={(tile as { href?: string }).href}
                    className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[#F59E0B] transition-colors hover:text-[#D97706]"
                  >
                    Get started <ArrowRight size={13} />
                  </a>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
