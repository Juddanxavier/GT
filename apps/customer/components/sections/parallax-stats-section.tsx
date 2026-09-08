'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { Award, MapPin, Package, Users } from 'lucide-react';
import Image from 'next/image';
import { useRef } from 'react';
import type { ReactNode } from 'react';
import { SectionIntro } from '@/components/sections/section-intro';

const stats = [
  { icon: Package, value: '10K+', label: 'Parcels delivered' },
  { icon: MapPin, value: '220+', label: 'Countries served' },
  { icon: Users, value: '5K+', label: 'Happy customers' },
  { icon: Award, value: '98%', label: 'On-time rate' },
];

export function ParallaxStatsSection(): ReactNode {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ['-12%', '12%']);

  return (
    <section ref={ref} className="relative overflow-hidden bg-brand-navy py-24 md:py-32">
      <motion.div
        style={{ y: bgY }}
        className="absolute inset-0 -top-[15%] -bottom-[15%]"
        aria-hidden
      >
        <Image
          src="/images/heroparcel.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
      </motion.div>
      <div className="absolute inset-0 bg-brand-navy/70" />
      <div className="absolute inset-0 bg-gradient-to-b from-brand-navy/80 via-brand-navy/50 to-brand-navy/90" />

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 md:px-12 lg:px-16">
        <SectionIntro
          eyebrow="By the numbers"
          title="Trusted worldwide"
          light
          align="center"
          className="mb-12"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="premium-card grid grid-cols-2 divide-white/10 overflow-hidden bg-white/5 backdrop-blur-md md:grid-cols-4 md:divide-x"
        >
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col items-center px-4 py-10 text-center"
            >
              <s.icon className="mb-3 size-5 text-brand-accent" />
              <p className="text-3xl font-semibold text-white md:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm text-white/55">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
