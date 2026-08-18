'use client';

import type { ReactNode } from 'react';
import { ArrowUpRight, Package, MapPin, Award, Users } from 'lucide-react';
import { motion } from 'framer-motion';
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
    <section id="about" className="relative bg-white overflow-hidden">
      <div className="absolute inset-0 bg-[url('/images/ctaabout.png')] bg-fixed bg-cover bg-center" />
      <div className="absolute inset-0 bg-[#1a1a2e]/90" />
      <div className="relative z-10 max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-16 md:py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Image collage */}
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative h-72 md:h-96 rounded-2xl overflow-hidden"
            >
              <img
                src="https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800&q=80"
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="absolute -bottom-6 -right-6 bg-[#F94735] rounded-2xl p-5 md:p-6 shadow-xl hidden md:block"
            >
              <p className="text-3xl md:text-4xl font-bold text-white">10+</p>
              <p className="text-white/80 mt-1">Years of Excellence</p>
            </motion.div>
          </div>

          {/* Right: Content */}
          <div className="flex flex-col">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-[#F94735] mb-4">
                <span className="w-6 h-px bg-[#F94735]" />
                About Us
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-[1.15] mb-4">
                {config.about.headline}
              </h2>
              <p className="text-white/85 leading-relaxed mb-8">
                {config.about.body}
              </p>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
            >
              {stats.map((s) => (
                <div key={s.label} className="bg-white/10 border border-white/10 rounded-xl p-4 text-center backdrop-blur-sm">
                  <div className="w-8 h-8 rounded-lg bg-[#F94735]/20 text-[#F94735] flex items-center justify-center mx-auto mb-2">
                    <s.icon className="size-4" />
                  </div>
                  <p className="text-lg font-bold text-white">{s.value}</p>
                  <p className="text-xs text-white/80 mt-0.5">{s.label}</p>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35, duration: 0.5 }}
            >
              <a href="/about" className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full bg-[#F94735] text-white text-sm font-semibold hover:bg-[#D83220] transition-colors cursor-pointer">
                {config.about.cta} <ArrowUpRight size={14} />
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
