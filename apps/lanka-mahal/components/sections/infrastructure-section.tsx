'use client';

import { motion } from 'framer-motion';
import { Clock, Globe, Headphones, Scan, Shield, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { SectionIntro } from '@/components/sections/section-intro';

const features = [
  { icon: Zap, title: 'Fast Delivery', desc: 'Express shipping with priority handling for time-sensitive parcels.' },
  { icon: Globe, title: 'Global Reach', desc: 'Delivering to 200+ countries with reliable partner networks.' },
  { icon: Shield, title: 'Secure Handling', desc: 'Tamper-proof packaging and end-to-end chain of custody.' },
  { icon: Clock, title: 'Real-time Tracking', desc: 'Live status updates at every scan point.' },
  { icon: Headphones, title: 'Dedicated Support', desc: 'Human support within hours, not days.' },
  { icon: Scan, title: 'Smart Logistics', desc: 'Automated routing and customs documentation.' },
];

export function InfrastructureSection(): ReactNode {
  return (
    <section className="premium-section bg-brand-cream">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 md:px-12 lg:px-16">
        <SectionIntro
          eyebrow="Why Choose Us"
          title="The foundation for reliable shipping"
          subtitle="We combine technology, infrastructure, and expertise to move parcels across borders seamlessly."
          align="center"
          className="mb-14 md:mb-16"
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.45 }}
              className="premium-card premium-card-hover group p-7"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-accent/15 to-brand-accent/5 text-brand-accent transition-colors group-hover:from-brand-accent group-hover:to-brand-accent-hover group-hover:text-white">
                <f.icon className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
