'use client';

import type { ReactNode } from 'react';
import { Phone, Package, Globe, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTenantConfig } from '@/lib/use-tenant-config';

const steps = [
  { icon: <Phone size={18} />, title: 'Book Pickup', desc: 'Schedule your pickup easily through our app or web.' },
  { icon: <Package size={18} />, title: 'Pack & Process', desc: 'Safe packing & handling by our experts.' },
  { icon: <Globe size={18} />, title: 'Ship Worldwide', desc: 'Fast global courier delivery network.' },
  { icon: <MapPin size={18} />, title: 'Deliver & Track', desc: 'Live tracking until it reaches the doorstep.' },
];

export function FreedomSection(): ReactNode {
  const config = useTenantConfig();

  return (
    <section className="w-screen left-[calc(-50vw+50%)] relative bg-white overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_1fr] items-center gap-12 lg:gap-16">
          <div className="flex flex-col order-last lg:order-first w-full">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-4">How It Works</p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight leading-[1.15]">
              {config.howItWorks.title}
            </h2>
            <p className="mt-4 text-lg text-foreground/70 leading-relaxed max-w-lg mb-10">
              {config.howItWorks.subtitle}
            </p>

            <div className="relative">
              <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-[#F59E0B]/20" />
              <div className="flex flex-col gap-8">
                {steps.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15, duration: 0.4 }}
                    className="relative flex gap-6"
                  >
                    <div className="relative z-10 flex items-center justify-center w-11 h-11 rounded-full bg-[#F59E0B] text-white shrink-0 shadow-md">
                      {s.icon}
                    </div>
                    <div className="pt-1.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-[#F59E0B] tracking-wider">STEP 0{i + 1}</span>
                      </div>
                      <p className="font-semibold text-foreground text-lg">{s.title}</p>
                      <p className="text-lg text-foreground/70 mt-0.5 leading-relaxed">{s.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center order-first lg:order-last">
            <img
              src="/images/gtman.png"
              alt=""
              className="w-full max-w-[clamp(320px,40vw,600px)] h-auto object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

