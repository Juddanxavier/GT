'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  Calculator,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import Link from 'next/link';

const trustPills = [
  { icon: ShieldCheck, label: 'Secure handling' },
  { icon: Truck, label: 'Doorstep pickup' },
  { icon: Package, label: 'Live tracking' },
] as const;

interface ShipSmarterCtaProps {
  showBranches?: boolean;
}

export function ShipSmarterCta({ showBranches = true }: ShipSmarterCtaProps) {
  const actions = [
    {
      href: '/check-price',
      icon: Calculator,
      title: 'Check Price',
      description: 'Instant rates by destination and weight',
      primary: true,
    },
    {
      href: '/pickup',
      icon: Truck,
      title: 'Schedule Pickup',
      description: 'Book a collection from your doorstep',
      primary: false,
    },
    ...(showBranches
      ? [
          {
            href: '/branches',
            icon: MapPin,
            title: 'Find a Branch',
            description: 'Locate your nearest drop-off point',
            primary: false,
          },
        ]
      : []),
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-navy via-[#0f2035] to-[#0a1628]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-accent/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-brand-accent/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(245,158,11,0.12),transparent)]"
      />

      <div className="relative grid gap-10 p-8 md:p-12 lg:grid-cols-[1fr_minmax(0,22rem)] lg:items-center lg:gap-14 xl:grid-cols-[1fr_minmax(0,24rem)]">
        <div className="text-center lg:text-left">
          <p className="mb-4 inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-brand-accent">
            <span className="h-px w-8 bg-brand-accent/60" />
            Ready when you are
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.08]">
            Ship Faster.
            <span className="mt-1 block text-brand-accent sm:mt-0 sm:inline sm:ml-2">
              Ship Smarter.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white/70 lg:mx-0">
            Get an instant quote, find a branch, or schedule a pickup — whatever works for you.
          </p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start">
            {trustPills.map((pill) => (
              <li
                key={pill.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/75"
              >
                <pill.icon size={13} className="text-brand-accent" aria-hidden />
                {pill.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-3">
          {actions.map((action, i) => (
            <motion.div
              key={action.href}
              initial={{ opacity: 0, x: 12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.35 }}
            >
              <Link
                href={action.href}
                className={`group flex items-center gap-4 rounded-2xl border p-4 transition-all duration-300 ${
                  action.primary
                    ? 'border-brand-accent/40 bg-brand-accent/15 hover:border-brand-accent/60 hover:bg-brand-accent/25'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    action.primary
                      ? 'bg-brand-accent text-white shadow-[0_4px_16px_-4px_rgba(245,158,11,0.45)]'
                      : 'bg-white/10 text-brand-accent'
                  }`}
                >
                  <action.icon size={20} aria-hidden />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block font-semibold text-white">{action.title}</span>
                  <span className="block text-sm text-white/55">{action.description}</span>
                </span>
                <ArrowRight
                  size={18}
                  className="shrink-0 text-white/35 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-accent"
                  aria-hidden
                />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
