'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { useTenantConfig } from '@/lib/use-tenant-config';
import { SectionIntro } from '@/components/sections/section-intro';

export function AboutSection(): ReactNode {
  const config = useTenantConfig();

  return (
    <section id="about" className="premium-section bg-surface">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 md:px-12 lg:px-16">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="premium-card overflow-hidden">
              <div className="relative aspect-[4/3]">
                <Image
                  src="/images/about.webp"
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/50 via-transparent to-transparent" />
              </div>
            </div>
            <div className="absolute -bottom-5 -right-3 rounded-2xl bg-brand-accent px-6 py-4 shadow-[0_12px_32px_-8px_rgba(232,98,26,0.4)] md:-right-6">
              <p className="text-3xl font-semibold text-white">10+</p>
              <p className="text-sm text-white/85">Years of excellence</p>
            </div>
          </motion.div>

          <div>
            <SectionIntro eyebrow="About Us" title={config.about.headline} subtitle={config.about.body} />
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="mt-8"
            >
              <a
                href="/about"
                className="inline-flex items-center gap-2 rounded-full bg-brand-navy px-7 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-navy-deep"
              >
                {config.about.cta} <ArrowUpRight size={15} />
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
