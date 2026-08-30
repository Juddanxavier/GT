'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, Award, MapPin, Package, Users } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { useTenantConfig } from '@/lib/use-tenant-config';

const stats = [
  { icon: Package, value: '10K+', label: 'Parcels Delivered' },
  { icon: MapPin, value: '220+', label: 'Countries Served' },
  { icon: Users, value: '5K+', label: 'Happy Customers' },
  { icon: Award, value: '98%', label: 'On-Time Rate' },
];

export function AboutSection(): ReactNode {
  const config = useTenantConfig();

  return (
    <section id="about" className="relative overflow-hidden bg-white">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#E8621A] to-transparent" />
      <div className="absolute inset-x-0 top-1 h-24 bg-gradient-to-b from-[#E8621A]/[0.03] to-transparent" />

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-16 sm:px-8 md:px-16 md:py-24 lg:px-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative h-72 overflow-hidden rounded-2xl md:h-96"
            >
              <Image
                src="/images/about.webp"
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="absolute -right-4 -bottom-6 hidden rounded-2xl bg-[#E8621A] p-5 shadow-xl md:block md:p-6"
            >
              <p className="text-3xl font-bold text-white md:text-4xl">10+</p>
              <p className="mt-1 text-white/80">Years of Excellence</p>
            </motion.div>
          </div>

          <div className="flex flex-col">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#E8621A]">
                <span className="h-px w-6 bg-[#E8621A]" />
                About Us
              </span>
              <h2 className="mt-4 text-2xl font-bold leading-[1.15] tracking-tight text-foreground md:text-3xl">
                {config.about.headline}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-foreground/70">
                {config.about.body}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4"
            >
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-border/50 bg-white p-4 text-center shadow-sm"
                >
                  <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8621A]/10 text-[#E8621A]">
                    <s.icon className="size-4" />
                  </div>
                  <p className="text-lg font-bold text-foreground">{s.value}</p>
                  <p className="mt-0.5 text-xs text-foreground/60">{s.label}</p>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="mt-8"
            >
              <a
                href="/about"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#E8621A] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#C45016]"
              >
                {config.about.cta} <ArrowUpRight size={14} />
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
