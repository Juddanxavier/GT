'use client';

import { motion } from 'framer-motion';
import { Globe, MapPin, Package, Phone } from 'lucide-react';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { images } from '@/lib/images';
import { useTenantConfig } from '@/lib/use-tenant-config';
import { SectionIntro } from '@/components/sections/section-intro';

const steps: Array<{ icon: LucideIcon; title: string; desc: string }> = [
  { icon: Phone, title: 'Book', desc: 'Call us or walk in — book your pickup by phone or in person.' },
  { icon: Package, title: 'Pack & Process', desc: 'Safe packing & handling by our experts.' },
  { icon: Globe, title: 'Ship Worldwide', desc: 'Fast global courier delivery network.' },
  { icon: MapPin, title: 'Deliver & Track', desc: 'Live tracking until it reaches the doorstep.' },
];

export function FreedomSection(): ReactNode {
  const config = useTenantConfig();

  return (
    <section className="premium-section overflow-hidden bg-surface">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 md:px-12 lg:px-16">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div className="order-2 lg:order-1">
            <SectionIntro
              eyebrow="How It Works"
              title={config.howItWorks.title}
              subtitle={config.howItWorks.subtitle}
            />

            <div className="mt-10 space-y-4">
              {steps.map((s, i) => (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.45 }}
                  className="premium-card flex gap-5 p-5"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-accent to-brand-accent-hover text-white shadow-[0_4px_16px_-4px_rgba(245,158,11,0.5)]">
                    <s.icon size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-brand-accent">
                      Step {i + 1}
                    </span>
                    <p className="mt-0.5 font-semibold text-foreground">{s.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="order-1 flex justify-center lg:order-2"
          >
            <div className="premium-card relative overflow-hidden p-3">
              <Image
                src={images.howItWorks}
                alt=""
                width={1024}
                height={1536}
                className="h-auto w-full max-w-[min(100%,420px)] rounded-2xl object-contain"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
