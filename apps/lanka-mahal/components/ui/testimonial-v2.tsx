'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useTenantConfig } from '@/lib/use-tenant-config';

export function TestimonialsSectionV2(): ReactNode {
  const config = useTenantConfig();

  const accentBg = 'bg-[#F59E0B]';

  return (
    <section className="relative bg-[#FAFAF7] py-24 overflow-hidden">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col items-center text-center max-w-lg mx-auto mb-16">
          <div className="border border-[#F59E0B]/20 py-1 px-4 rounded-full text-sm font-semibold tracking-wide uppercase text-[#B45309] bg-[#F59E0B]/10">
            Testimonials
          </div>
          <h2 className="mt-6 text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            What <span className="text-[#F59E0B]">our users say</span>
          </h2>
          <p className="mt-5 text-foreground/70 text-base leading-relaxed max-w-sm">
            Trusted by thousands of shippers worldwide.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {config.testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="rounded-2xl bg-white p-8 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] transition-shadow"
            >
              <div className="flex gap-1 mb-5">
                {Array.from({ length: 5 }).map((_, si) => (
                  <Star key={si} size={14} className="fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-foreground text-base leading-relaxed mb-6">{t.text}</p>
              <div className="flex items-center gap-3 pt-5 border-t border-border/60">
                <div className={`w-10 h-10 rounded-full ${accentBg} flex items-center justify-center text-base font-semibold text-white`}>
                  {t.name.charAt(0)}
                </div>
                <div>
                  <cite className="font-semibold not-italic text-foreground text-base">{t.name}</cite>
                  <span className="text-base text-foreground/60 block">{t.role}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

