'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowUpRight, PackageSearch } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useTenantConfig } from '@/lib/use-tenant-config';

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
    <section id="track" className="relative bg-[#1a1a2e] overflow-hidden min-h-screen flex items-center">
      <div className="absolute inset-0">
        <Image
          src="/images/heroparcel.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover hidden md:block"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e]/85 via-[#1a1a2e]/45 to-[#1a1a2e]/15" />
      </div>

      <div className="relative z-10 px-8 md:px-16 lg:px-24 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-[#F94735] mb-6">
            <span className="w-6 h-px bg-[#F94735]" />
            {config.hero.badge}
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-white max-w-2xl">
            {config.hero.headline[0]}{' '}
            <span className="text-[#F94735]">{config.hero.headline[1]}</span>
          </h1>

          <p className="mt-5 text-white/70 max-w-md leading-relaxed">
            {config.hero.description}
          </p>

          <form
            onSubmit={handleTrack}
            className="mt-8 rounded-3xl sm:rounded-full border border-white/20 bg-white/10 p-1.5 backdrop-blur-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-md"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0 px-3 sm:px-4">
              <PackageSearch size={16} className="text-white/40 shrink-0" />
              <input
                type="text"
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
                placeholder="Enter tracking number"
                className="w-full bg-transparent py-2.5 text-white outline-none placeholder:text-white/40"
              />
            </div>
            <button
              type="submit"
              disabled={!trackingNo.trim()}
              className="w-full sm:w-auto justify-center shrink-0 px-5 py-2.5 rounded-full bg-[#F94735] text-white text-sm font-semibold hover:bg-[#D83220] transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              Track <ArrowRight size={14} />
            </button>
          </form>

          <p className="mt-3 text-white/60">{config.hero.trust}</p>

          <div className="flex flex-wrap items-center gap-3 mt-8">
            <a href="/register" className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full bg-[#F94735] text-white text-sm font-semibold hover:bg-[#D83220] transition-colors cursor-pointer">
              {config.hero.ctaQuote} <ArrowUpRight size={14} />
            </a>
            <a href="#services" className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full border border-white/30 text-white text-sm font-semibold hover:bg-white/10 transition-colors cursor-pointer">
              Explore Services
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
