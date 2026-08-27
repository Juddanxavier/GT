'use client';

import { MotionConfig, motion, type Variants } from 'framer-motion';
import { ArrowRight, Send, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTenantConfig } from '@/lib/use-tenant-config';

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
};

export function HeroSection(): ReactNode {
  const router = useRouter();
  const config = useTenantConfig();

  return (
    <section
      id="track"
      className="relative flex min-h-[100svh] items-center overflow-hidden bg-[#1a1a2e]"
    >
      <div className="absolute inset-0">
        <Image
          src="/images/hero-bg.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e]/85 via-[#1a1a2e]/45 to-[#1a1a2e]/15" />
      </div>

      <MotionConfig reducedMotion="user">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative z-10 mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 md:px-12 md:py-32 lg:px-16"
        >
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#F94735]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F94735] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F94735]" />
              </span>
              {config.hero.badge}
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-6 max-w-lg text-3xl font-bold leading-[1.08] tracking-tight text-white sm:text-4xl"
          >
            {config.hero.headline[0]}
            <br />
            <span className="text-[#F94735]">{config.hero.headline[1]}</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-5 max-w-md text-base leading-relaxed text-white/75"
          >
            {config.hero.description}
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <a
              href="/pickup"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#F94735] px-7 text-sm font-semibold text-white transition-colors hover:bg-[#D83220]"
            >
              <Send size={16} />
              {config.hero.ctaTrack}
            </a>
            <a
              href="#services"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-full border border-white/25 bg-white/[0.06] px-7 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Track a Shipment <ArrowRight size={14} />
            </a>
          </motion.div>

          <motion.p variants={item} className="mt-6 flex items-center gap-2 text-sm text-white/70">
            <ShieldCheck size={15} className="shrink-0 text-[#F94735]/80" />
            {config.hero.trust}
          </motion.p>
        </motion.div>
      </MotionConfig>
    </section>
  );
}
