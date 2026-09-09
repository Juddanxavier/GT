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
import { useTenantConfig } from '@/lib/use-tenant-config';
import { SectionIntro } from '@/components/sections/section-intro';

const TILES = [
  {
    id: 'track',
    icon: PackageSearch,
    title: 'Track Shipment',
    description: 'Real-time status on any shipment, no login needed.',
    href: '/track',
    tint: 'from-brand-navy to-[#152a45]',
    light: true,
  },
  {
    id: 'pickup',
    icon: CalendarClock,
    title: 'Schedule Pickup',
    description: 'Pickup within 5 km of our offices. Conditions apply.',
    href: '/pickup',
    tint: 'from-brand-cream to-white',
    light: false,
  },
  {
    id: 'customs',
    icon: ShieldCheck,
    title: 'Customs Support',
    description: 'Hassle-free clearance for every destination.',
    href: '/faq',
    tint: 'from-white to-brand-cream',
    light: false,
  },
  {
    id: 'invoice',
    icon: FileText,
    title: 'View Invoices',
    description: 'Download & manage billing in one place.',
    href: '/my-invoices',
    tint: 'from-white to-brand-cream',
    light: false,
  },
  {
    id: 'delivery',
    icon: Truck,
    title: 'Door-to-Door',
    description: "From pickup to your recipient's doorstep.",
    href: '/air-freight',
    tint: 'from-brand-cream to-white',
    light: false,
  },
] as const;

export function ServicesSection(): ReactNode {
  const config = useTenantConfig();
  const router = useRouter();

  return (
    <section id="services" className="premium-section relative overflow-hidden bg-brand-cream">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(245,158,11,0.06),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 md:px-12 lg:px-16">
        <SectionIntro
          eyebrow="Quick Services"
          title={config.services.title}
          subtitle={config.services.subtitle}
          align="center"
          className="mb-14 md:mb-16"
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TILES.map((tile, i) => {
            const Icon = tile.icon;
            const isTrack = tile.id === 'track';

            return (
              <motion.a
                key={tile.id}
                href={tile.href}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(tile.href);
                }}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                className={`premium-card premium-card-hover group relative flex flex-col justify-between overflow-hidden bg-gradient-to-br p-7 ${tile.tint} ${isTrack ? 'sm:col-span-2 lg:col-span-1 lg:row-span-2 lg:min-h-[280px]' : 'min-h-[160px]'}`}
              >
                <div
                  className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl ${isTrack ? 'bg-brand-accent/20' : 'bg-brand-accent/10'}`}
                />
                <div className="relative">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tile.light ? 'bg-white/10 text-white' : 'bg-brand-accent/10 text-brand-accent'}`}
                  >
                    <Icon size={20} />
                  </span>
                  <h3
                    className={`mt-5 text-lg font-semibold ${tile.light ? 'text-white' : 'text-foreground'}`}
                  >
                    {tile.title}
                  </h3>
                  <p className={`mt-2 text-sm leading-relaxed ${tile.light ? 'text-white/65' : 'text-muted'}`}>
                    {tile.description}
                  </p>
                </div>
                <span className="relative mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand-accent">
                  Explore <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </span>
              </motion.a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
