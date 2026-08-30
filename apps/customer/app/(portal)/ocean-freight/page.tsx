'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle,
  FileText,
  Globe,
  MapPin,
  Shield,
  Ship,
  Weight,
} from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { FaqSection } from '@/components/sections/faq-section';

const routes = [
  {
    flag: '🇨🇦',
    country: 'Canada',
    port: 'Toronto, Vancouver, Montreal',
    transit: '25–30 days',
    via: 'JNPT (Mumbai) → Colombo → Halifax/Vancouver',
    desc: 'Reliable ocean freight from India to Canadian ports with full customs support.',
    color: 'from-[#E8621A]/10 to-white border-[#E8621A]/20',
    flagBg: 'bg-[#E8621A]/5',
  },
  {
    flag: '🇬🇧',
    country: 'United Kingdom',
    port: 'Felixstowe, Southampton, London',
    transit: '22–28 days',
    via: 'JNPT (Mumbai) → Suez → Felixstowe',
    desc: 'Regular LCL and FCL services to UK ports with door delivery options.',
    color: 'from-[#E8621A]/10 to-white border-[#E8621A]/20',
    flagBg: 'bg-[#E8621A]/5',
  },
  {
    flag: '🇸🇬',
    country: 'Singapore',
    port: 'Singapore Port',
    transit: '10–14 days',
    via: 'Chennai / JNPT → Singapore',
    desc: 'Fast ocean freight to Singapore with frequent weekly sailings.',
    color: 'from-[#E8621A]/10 to-white border-[#E8621A]/20',
    flagBg: 'bg-[#E8621A]/5',
  },
  {
    flag: '🇲🇾',
    country: 'Malaysia',
    port: 'Port Klang, Penang',
    transit: '12–16 days',
    via: 'Chennai / JNPT → Port Klang',
    desc: 'Cost-effective ocean shipping to Malaysia for commercial and personal cargo.',
    color: 'from-[#E8621A]/10 to-white border-[#E8621A]/20',
    flagBg: 'bg-[#E8621A]/5',
  },
  {
    flag: '🇱🇰',
    country: 'Sri Lanka',
    port: 'Colombo Port',
    transit: '3–5 days',
    via: 'Chennai / Tuticorin → Colombo',
    desc: 'Short-sea freight to Sri Lanka with the fastest transit from Indian ports.',
    color: 'from-[#E8621A]/10 to-white border-[#E8621A]/20',
    flagBg: 'bg-[#E8621A]/5',
  },
];

const features = [
  {
    icon: FileText,
    title: 'Documentation & customs handled',
    desc: 'Bills of Lading, export declarations, and compliance — we manage it all.',
  },
  {
    icon: Weight,
    title: 'LCL & FCL solutions',
    desc: 'Shared containers for smaller loads or dedicated containers for bulk cargo.',
  },
  {
    icon: Shield,
    title: 'Cargo insurance available',
    desc: 'Optional insurance for an added layer of protection during ocean transit.',
  },
  {
    icon: Globe,
    title: '5 major Indian ports',
    desc: 'JNPT, Chennai, Mundra, Visakhapatnam, and Kolkata — we cover all gateways.',
  },
];

const containerOptions = [
  {
    size: '20 ft Standard',
    capacity: '~28 CBM / 22,000 kg',
    best: 'Small machinery, furniture lots',
  },
  {
    size: '40 ft Standard',
    capacity: '~58 CBM / 26,000 kg',
    best: 'Bulk commercial cargo, retail inventory',
  },
  {
    size: '40 ft High Cube',
    capacity: '~72 CBM / 26,000 kg',
    best: 'Light bulky cargo, large-volume shipments',
  },
];

export default function OceanFreightPage(): ReactNode {
  return (
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden min-h-[400px] md:min-h-[500px] flex items-center bg-[#1a1a2e]">
        <div className="absolute inset-0">
          <Image src="/images/heroparcel.webp" alt="" fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-[#1a1a2e]/70" />
          
        </div>
        <div className="relative z-10 px-5 sm:px-8 md:px-16 lg:px-24 w-full">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#E8621A] mb-6">
            <span className="w-6 h-px bg-[#E8621A]" />
            Ocean Freight
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.08] text-white">
            Ocean Freight Services
          </h1>
          <p className="text-base text-white/65 max-w-md mt-4">
            Affordable LCL & FCL shipping from India to Canada, UK, Singapore, Malaysia, and Sri
            Lanka.
          </p>
        </div>
      </section>

      <section className="relative bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <div className="max-w-5xl mx-auto space-y-14">
            <div>
              <p className="text-lg text-foreground leading-relaxed mb-10">
                Shipping large or heavy cargo internationally doesn't have to be complicated or
                expensive. Ocean freight is the smartest way to move bulk goods across borders. We
                take care of everything from India's major ports to doorsteps across{' '}
                <strong>Canada, UK, Singapore, Malaysia, and Sri Lanka</strong>.
              </p>

              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#E8621A] mb-6">
                <span className="w-6 h-px bg-[#E8621A]" />
                Routes & Transit
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-8">
                Our ocean freight <span className="text-[#E8621A]">routes</span>
              </h2>

              <div className="space-y-4">
                {routes.map((r, i) => (
                  <motion.div
                    key={r.country}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.3 }}
                    className={`rounded-2xl border bg-gradient-to-br ${r.color} p-5 md:p-6`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl ${r.flagBg} border border-black/5 flex items-center justify-center text-xl shrink-0`}
                      >
                        {r.flag}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-1">
                          <h3 className="text-xl font-bold text-foreground">{r.country}</h3>
                          <span className="text-sm font-semibold text-[#E8621A] bg-[#E8621A]/10 px-3 py-0.5 rounded-full">
                            {r.transit}
                          </span>
                        </div>
                        <p className=" text-foreground leading-relaxed mb-2">{r.desc}</p>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-foreground">
                          <span className="flex items-center gap-1.5">
                            <MapPin size={14} className="text-[#E8621A]" /> {r.port}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Ship size={14} className="text-[#E8621A]" /> {r.via}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#E8621A] mb-6">
                <span className="w-6 h-px bg-[#E8621A]" />
                Container Solutions
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-2">
                LCL & FCL <span className="text-[#E8621A]">container options</span>
              </h2>
              <p className="text-lg text-foreground mb-8">
                Whether you're sending a few packages or a full container load, we'll find the right
                fit.
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {[
                  {
                    title: 'Less than Container Load (LCL)',
                    desc: 'Your cargo travels alongside other shipments in a shared container headed to the same destination. You only pay for the space you use.',
                    steps: [
                      'We pack and prepare your cargo for ocean shipping',
                      'Goods are consolidated with compatible shipments',
                      'Container sails on a fixed schedule',
                      'Cargo is separated and ready for collection on arrival',
                    ],
                    best: 'Small businesses, product samples, personal exports',
                     color: 'text-blue-600',
                     bg: 'bg-[#E8621A]/5 border border-[#E8621A]/20',
                   },
                   {
                     title: 'Full Container Load (FCL)',
                     desc: 'Your goods get an entire container — less handling, lower damage risk, and better rates per unit for bulk cargo.',
                     steps: [
                       'Right container size arranged for your cargo',
                       'Goods loaded securely and sealed before departure',
                       'Container ships directly to your destination port',
                       'Customs-cleared and released on arrival',
                     ],
                     best: 'Bulk cargo, machinery, retail inventory, commercial exports',
                     color: 'text-emerald-600',
                     bg: 'bg-[#E8621A]/5 border border-[#E8621A]/20',
                  },
                ].map((option, i) => (
                  <motion.div
                    key={option.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                    className={`rounded-2xl border p-6 ${option.bg}`}
                  >
                    <h3 className="text-lg font-bold text-foreground mb-2">{option.title}</h3>
                    <p className=" text-foreground leading-relaxed mb-4">{option.desc}</p>
                    <div className="space-y-1.5 mb-4">
                      {option.steps.map((s) => (
                        <div key={s} className="flex items-start gap-2 text-foreground">
                          <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                    <div className=" text-foreground border-t border-white/50 pt-3">
                      <strong>Best for:</strong> {option.best}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="rounded-2xl border border-border bg-surface/30 overflow-hidden">
                <div className="p-5 border-b border-border">
                  <h3 className="text-lg font-bold text-foreground">Available container sizes</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-5 py-3 font-bold text-foreground/90 uppercase tracking-wider">
                          Size
                        </th>
                        <th className="text-left px-5 py-3 font-bold text-foreground/90 uppercase tracking-wider">
                          Capacity
                        </th>
                        <th className="text-left px-5 py-3 font-bold text-foreground/90 uppercase tracking-wider">
                          Best For
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {containerOptions.map((c) => (
                        <tr key={c.size} className="border-b border-border last:border-b-0">
                          <td className="px-5 py-3 font-semibold text-foreground">{c.size}</td>
                          <td className="px-5 py-3 text-foreground">{c.capacity}</td>
                          <td className="px-5 py-3 text-foreground">{c.best}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="rounded-xl border border-border bg-white p-5 text-center"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#E8621A]/10 text-[#E8621A] flex items-center justify-center mx-auto mb-3">
                    <f.icon size={20} />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1">{f.title}</h3>
                  <p className=" text-foreground leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>

            <div className="relative overflow-hidden rounded-2xl p-8 md:p-12 text-center">
              <div className="absolute inset-0 bg-[#1a1a2e]" />
              <div className="cta-orb cta-orb-1" />
              <div className="cta-orb cta-orb-2" />
              <div className="cta-orb cta-orb-3" />
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.08] text-white mb-3">
                  Ready to ship{' '}
                  <span className="text-[#E8621A]">by ocean?</span>
                </h2>
                <p className="text-base text-white/75 max-w-lg mx-auto mb-8">
                  Get an instant quote or speak to our freight experts to plan your next shipment.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <a
                    href="/quote"
                    className="px-6 py-3 rounded-xl bg-white text-[#E8621A] text-base font-semibold hover:bg-white/90 transition-colors inline-flex items-center gap-2"
                  >
                    Get a Quote <ArrowRight size={16} />
                  </a>
                  <a
                    href="/contact"
                    className="px-6 py-3 rounded-xl border border-white/20 text-white text-base font-semibold hover:bg-white/10 transition-colors inline-flex items-center gap-2"
                  >
                    Speak to an Expert
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FaqSection />

      <style>{`
        .cta-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.5;
          will-change: transform;
        }
        .cta-orb-1 {
          width: 300px; height: 300px;
          background: #E8621A;
          top: -40px; left: -60px;
          animation: orbFloat1 8s ease-in-out infinite;
        }
        .cta-orb-2 {
          width: 200px; height: 200px;
          background: #FFB347;
          bottom: -30px; right: -20px;
          animation: orbFloat2 10s ease-in-out infinite;
        }
        .cta-orb-3 {
          width: 160px; height: 160px;
          background: #E8621A;
          top: 50%; left: 55%;
          opacity: 0.25;
          animation: orbFloat3 12s ease-in-out infinite;
        }
        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(60px, 40px) scale(1.1); }
          66% { transform: translate(-20px, 70px) scale(0.95); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-50px, -30px) scale(1.15); }
          66% { transform: translate(30px, -60px) scale(0.9); }
        }
        @keyframes orbFloat3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, 30px) scale(1.2); }
        }
      `}</style>
    </div>
  );
}
