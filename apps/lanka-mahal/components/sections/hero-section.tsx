'use client';

import { MotionConfig, motion, type Variants } from 'framer-motion';
import { ArrowRight, MessageCircle, Phone, Search, Send, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTenantConfig } from '@/lib/use-tenant-config';
import { HeroImageOverlays } from '@/components/page/hero-image-overlays';
import { images } from '@/lib/images';

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

function whatsAppHref(phoneHref: string): string {
  return `https://wa.me/${phoneHref.replace(/\D/g, '')}`;
}

export function HeroSection(): ReactNode {
  const router = useRouter();
  const config = useTenantConfig();
  const [trackingNo, setTrackingNo] = useState('');

  function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingNo.trim()) return;
    router.push(`/track/${encodeURIComponent(trackingNo.trim())}`);
  }

  return (
    <section
      id="track"
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden bg-brand-navy"
    >
      <div className="absolute inset-0">
        <Image
          src={images.hero}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <HeroImageOverlays />
      </div>

      <MotionConfig reducedMotion="user">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative z-10 mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 sm:py-28 md:px-12 lg:px-16"
        >
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/80 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-accent" />
              {config.hero.badge}
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-6 max-w-2xl text-3xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl"
          >
            {config.hero.headline[0]}
            <br />
            <span className="bg-gradient-to-r from-brand-accent to-amber-300 bg-clip-text text-transparent">
              {config.hero.headline[1]}
            </span>
          </motion.h1>

          <motion.p variants={item} className="mt-5 max-w-lg text-base leading-relaxed text-white/70 md:text-lg">
            {config.hero.description}
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-wrap gap-3">
            <a
              href={config.contact.phoneHref}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-brand-accent px-6 text-sm font-medium text-white shadow-[0_8px_24px_-4px_rgba(245,158,11,0.45)] transition-all hover:bg-brand-accent-hover"
            >
              <Phone size={15} />
              Call us
            </a>
            <a
              href={whatsAppHref(config.contact.phoneHref)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/10"
            >
              <MessageCircle size={15} />
              WhatsApp
            </a>
            <a
              href="/pickup"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/10"
            >
              <Send size={15} />
              {config.hero.ctaTrack}
            </a>
          </motion.div>

          <motion.form
            variants={item}
            onSubmit={handleTrack}
            className="mt-8 flex w-full max-w-md flex-col gap-2 rounded-2xl border border-white/10 bg-white/10 p-3 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:flex-row sm:items-center sm:rounded-full sm:p-1.5"
          >
            <div className="relative min-w-0 flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
              />
              <input
                type="text"
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
                placeholder="Tracking number"
                aria-label="Tracking number"
                className="h-10 w-full rounded-full bg-transparent pl-11 pr-3 text-sm text-white outline-none placeholder:text-white/40"
              />
            </div>
            <button
              type="submit"
              disabled={!trackingNo.trim()}
              className="flex h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-full bg-white px-5 text-sm font-medium text-brand-navy disabled:opacity-40 sm:w-auto"
            >
              Track <ArrowRight size={13} />
            </button>
          </motion.form>

          <motion.p variants={item} className="mt-5 flex items-center gap-2 text-sm text-white/50">
            <ShieldCheck size={14} className="text-brand-accent/80" />
            {config.hero.trust}
          </motion.p>
        </motion.div>
      </MotionConfig>
    </section>
  );
}
