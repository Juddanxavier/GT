'use client';

import { MotionConfig, motion, type Variants } from 'framer-motion';
import { ArrowRight, ArrowUpRight, PackageSearch, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTenantConfig } from '@/lib/use-tenant-config';

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
};

export function HeroSection(): ReactNode {
  const router = useRouter();
  const config = useTenantConfig();
  const [trackingNo, setTrackingNo] = useState('');

  function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    const value = trackingNo.trim();
    if (!value) return;
    router.push(`/track/${encodeURIComponent(value)}`);
  }

  return (
    <section
      id="track"
      className="relative flex min-h-[100svh] items-center overflow-hidden bg-[#1a1a2e]"
    >
      <div className="absolute inset-0">
        <Image
          src="/images/heroparcel.png"
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
            <span className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#F59E0B] sm:text-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F59E0B] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F59E0B]" />
              </span>
              {config.hero.badge}
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-6 max-w-2xl text-[2rem] font-bold leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-5xl"
          >
            {config.hero.headline[0]}{' '}
            <span className="text-[#F59E0B]">{config.hero.headline[1]}</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-5 max-w-md text-base leading-relaxed text-white/75"
          >
            {config.hero.description}
          </motion.p>

          <motion.div variants={item} className="mt-8 max-w-md w-full">
            <form
              onSubmit={handleTrack}
              className="flex flex-col items-stretch gap-2 rounded-3xl border border-white/15 bg-white/[0.08] p-2 backdrop-blur-md transition-colors focus-within:border-[#F59E0B]/60 focus-within:bg-white/[0.12] sm:flex-row sm:items-center sm:rounded-full sm:gap-1.5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3 px-3 sm:px-4">
                <PackageSearch size={18} className="shrink-0 text-white/50" />
                <input
                  type="text"
                  value={trackingNo}
                  onChange={(e) => setTrackingNo(e.target.value)}
                  placeholder="Enter tracking number"
                  aria-label="Tracking number"
                  autoComplete="off"
                  className="h-12 w-full bg-transparent text-base text-white outline-none placeholder:text-white/45"
                />
              </div>
              <button
                type="submit"
                disabled={!trackingNo.trim()}
                className="flex h-12 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-2xl bg-[#F59E0B] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#D97706] disabled:opacity-50 sm:w-auto sm:rounded-full"
              >
                {config.hero.ctaTrack} <ArrowRight size={14} />
              </button>
            </form>

            <p className="mt-4 flex items-center gap-2 text-sm text-white/70">
              <ShieldCheck size={15} className="shrink-0 text-[#F59E0B]/80" />
              {config.hero.trust}
            </p>
          </motion.div>

          <motion.div
            variants={item}
            className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
          >
            <a
              href="/register"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-full bg-[#F59E0B] px-7 text-sm font-semibold text-white transition-colors hover:bg-[#D97706]"
            >
              {config.hero.ctaQuote} <ArrowUpRight size={14} />
            </a>
            <a
              href="#services"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-full border border-white/25 bg-white/[0.06] px-7 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Explore Services
            </a>
          </motion.div>
        </motion.div>
      </MotionConfig>
    </section>
  );
}
