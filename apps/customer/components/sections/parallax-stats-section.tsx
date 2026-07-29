'use client';

import type { ReactNode } from 'react';
import { Package, MapPin, Users, Award } from 'lucide-react';

const stats = [
  { icon: Package, value: '10K+', label: 'Parcels Delivered' },
  { icon: MapPin, value: '220+', label: 'Countries Served' },
  { icon: Users, value: '5K+', label: 'Happy Customers' },
  { icon: Award, value: '98%', label: 'On-Time Rate' },
];

export function ParallaxStatsSection(): ReactNode {
  return (
    <section className="w-screen left-[calc(-50vw+50%)] relative bg-[#1a1a2e] overflow-hidden">
      <div className="absolute inset-0 bg-[url('/images/heroparcel.png')] bg-fixed bg-cover bg-center opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e]/90 via-[#1a1a2e]/60 to-[#1a1a2e]/90" />
      <div className="relative z-10 max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-20 md:py-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="w-12 h-12 rounded-xl bg-[#F94735]/10 text-[#F94735] flex items-center justify-center mx-auto mb-4">
                <s.icon className="size-6" />
              </div>
              <p className="text-3xl md:text-4xl font-bold text-white mb-1">{s.value}</p>
              <p className="text-white/60">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
