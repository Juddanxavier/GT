'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTenantConfig } from '@/lib/use-tenant-config';
import { SectionIntro } from '@/components/sections/section-intro';

export function TestimonialsSectionV2(): ReactNode {
  const config = useTenantConfig();

  return (
    <section className="premium-section overflow-hidden bg-surface">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 md:px-12 lg:px-16">
        <SectionIntro
          eyebrow="Testimonials"
          title="What our customers say"
          subtitle="Trusted by thousands of shippers worldwide."
          align="center"
          className="mb-14"
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {config.testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ delay: (i % 3) * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="premium-card premium-card-hover flex flex-col p-7"
            >
              <div className="mb-4 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, si) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed star row
                  <Star key={si} size={13} className="fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="flex-1 text-sm leading-relaxed text-foreground">{t.text}</p>
              <div className="mt-6 flex items-center gap-3 border-t border-border/50 pt-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-navy to-[#152a45] text-sm font-medium text-white">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <cite className="font-medium not-italic text-sm text-foreground">{t.name}</cite>
                  <span className="block text-xs text-muted">{t.role}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
