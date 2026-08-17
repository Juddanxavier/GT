'use client';

import type { ReactNode } from 'react';
import { Zap, Globe, Shield, Clock, Headphones, Scan } from 'lucide-react';

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
    <section className="w-screen left-[calc(-50vw+50%)] relative bg-surface">
      <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-16 md:py-20">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <span className="inline-flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-4">
            <span className="w-6 h-px bg-[#F59E0B]" />
            Why Choose Us
          </span>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-[1.15]">
            The foundation for <span className="text-[#F59E0B]">reliable shipping.</span>
          </h2>
          <p className="mt-4 text-lg text-foreground/70 max-w-lg mx-auto leading-relaxed">
            We combine technology, infrastructure, and expertise to move parcels across borders seamlessly.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl bg-white border border-border p-7 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center mb-5">
                <f.icon className="size-5" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1.5">{f.title}</h3>
              <p className="text-lg text-foreground/70 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

