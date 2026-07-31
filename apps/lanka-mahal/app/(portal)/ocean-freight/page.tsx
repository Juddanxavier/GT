'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Container, Ship, Weight, Clock, Shield, Globe, MapPin, FileText, ArrowRight, CheckCircle, HelpCircle } from 'lucide-react';
import { FaqSection } from '@/components/sections/faq-section';

const routes = [
  {
    flag: 'ðŸ‡¨ðŸ‡¦',
    country: 'Canada',
    port: 'Toronto, Vancouver, Montreal',
    transit: '25â€“30 days',
    via: 'Colombo â†’ Halifax/Vancouver',
    desc: 'Reliable ocean freight from Sri Lanka to Canadian ports with full customs support.',
    color: 'from-red-100 to-white border-red-200',
    flagBg: 'bg-red-50',
  },
  {
    flag: 'ðŸ‡¬ðŸ‡§',
    country: 'United Kingdom',
    port: 'Felixstowe, Southampton, London',
    transit: '22â€“28 days',
    via: 'Colombo â†’ Suez â†’ Felixstowe',
    desc: 'Regular LCL and FCL services to UK ports with door delivery options.',
    color: 'from-blue-100 to-white border-blue-200',
    flagBg: 'bg-blue-50',
  },
  {
    flag: 'ðŸ‡¸ðŸ‡¬',
    country: 'Singapore',
    port: 'Singapore Port',
    transit: '10â€“14 days',
    via: 'Colombo â†’ Singapore',
    desc: 'Fast ocean freight to Singapore with frequent weekly sailings.',
    color: 'from-red-100 to-white border-red-200',
    flagBg: 'bg-red-50',
  },
  {
    flag: 'ðŸ‡²ðŸ‡¾',
    country: 'Malaysia',
    port: 'Port Klang, Penang',
    transit: '12â€“16 days',
    via: 'Colombo â†’ Port Klang',
    desc: 'Cost-effective ocean shipping to Malaysia for commercial and personal cargo.',
    color: 'from-blue-100 to-white border-blue-200',
    flagBg: 'bg-blue-50',
  },
  {
    flag: 'ðŸ‡±ðŸ‡°',
    country: 'Sri Lanka',
    port: 'Colombo Port',
    transit: '3â€“5 days',
    via: 'Colombo (direct)',
    desc: 'Short-sea freight within the region with the fastest transit times.',
    color: 'from-amber-100 to-white border-amber-200',
    flagBg: 'bg-amber-50',
  },
];

const features = [
  { icon: FileText, title: 'Documentation & customs handled', desc: 'Bills of Lading, export declarations, and compliance - we manage it all.' },
  { icon: Weight, title: 'LCL & FCL solutions', desc: 'Shared containers for smaller loads or dedicated containers for bulk cargo.' },
  { icon: Shield, title: 'Cargo insurance available', desc: 'Optional insurance for an added layer of protection during ocean transit.' },
  { icon: Globe, title: 'All major gateway ports', desc: 'Colombo, Hambantota, and partner port networks - we cover all gateways.' },
];

const containerOptions = [
  { size: '20 ft Standard', capacity: '~28 CBM / 22,000 kg', best: 'Small machinery, furniture lots' },
  { size: '40 ft Standard', capacity: '~58 CBM / 26,000 kg', best: 'Bulk commercial cargo, retail inventory' },
  { size: '40 ft High Cube', capacity: '~72 CBM / 26,000 kg', best: 'Light bulky cargo, large-volume shipments' },
];

export default function OceanFreightPage(): ReactNode {
  return (
    <div className="min-h-screen bg-white">
      <section className="w-screen left-[calc(-50vw+50%)] relative overflow-hidden min-h-[450px] md:min-h-[600px] flex items-center bg-[#1a1a2e]">
        <div className="absolute inset-0">
          <img src="/images/heroparcel.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e] via-[#1a1a2e]/70 to-transparent" />
        </div>
        <div className="relative z-10 px-8 md:px-16 lg:px-24 w-full">
          <span className="inline-flex items-center gap-2 text-base font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-3">
            <span className="w-6 h-px bg-[#F59E0B]" />
            Ocean Freight
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Ocean Freight Services</h1>
          <p className="text-lg text-white/90 max-w-xl mt-2">
            Affordable LCL & FCL shipping from Sri Lanka to Canada, UK, Singapore, and Malaysia.
          </p>
        </div>
      </section>

      <section className="w-screen left-[calc(-50vw+50%)] relative bg-white">
        <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-16 md:py-20">
          <div className="max-w-5xl mx-auto space-y-14">
            <div>
              <p className="text-lg text-foreground leading-relaxed mb-10">
                Shipping large or heavy cargo internationally doesn't have to be complicated or expensive. Ocean freight is the smartest way to move bulk goods across borders. We take care of everything from Sri Lanka's ports to doorsteps across <strong>Canada, UK, Singapore, and Malaysia</strong>.
              </p>

              <span className="inline-flex items-center gap-2 text-base font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-4">
                <span className="w-6 h-px bg-[#F59E0B]" />
                Routes & Transit
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-8">
                Our ocean freight <span className="text-[#F59E0B]">routes</span>
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
                      <div className={`w-12 h-12 rounded-xl ${r.flagBg} border border-black/5 flex items-center justify-center text-xl shrink-0`}>
                        {r.flag}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-1">
                          <h3 className="text-xl font-bold text-foreground">{r.country}</h3>
                          <span className="text-sm font-semibold text-[#F59E0B] bg-[#F59E0B]/10 px-3 py-0.5 rounded-full">{r.transit}</span>
                        </div>
                        <p className=" text-foreground leading-relaxed mb-2">{r.desc}</p>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-foreground">
                          <span className="flex items-center gap-1.5"><MapPin size={14} className="text-[#F59E0B]" /> {r.port}</span>
                          <span className="flex items-center gap-1.5"><Ship size={14} className="text-[#F59E0B]" /> {r.via}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <span className="inline-flex items-center gap-2 text-base font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-4">
                <span className="w-6 h-px bg-[#F59E0B]" />
                Container Solutions
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-2">
                LCL & FCL <span className="text-[#F59E0B]">container options</span>
              </h2>
              <p className="text-lg text-foreground mb-8">
                Whether you're sending a few packages or a full container load, we'll find the right fit.
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {[
                  {
                    title: 'Less than Container Load (LCL)',
                    desc: 'Your cargo travels alongside other shipments in a shared container headed to the same destination. You only pay for the space you use.',
                    steps: ['We pack and prepare your cargo for ocean shipping', 'Goods are consolidated with compatible shipments', 'Container sails on a fixed schedule', 'Cargo is separated and ready for collection on arrival'],
                    best: 'Small businesses, product samples, personal exports',
                    color: 'text-blue-600',
                    bg: 'bg-blue-50 border-blue-200',
                  },
                  {
                    title: 'Full Container Load (FCL)',
                    desc: 'Your goods get an entire container - less handling, lower damage risk, and better rates per unit for bulk cargo.',
                    steps: ['Right container size arranged for your cargo', 'Goods loaded securely and sealed before departure', 'Container ships directly to your destination port', 'Customs-cleared and released on arrival'],
                    best: 'Bulk cargo, machinery, retail inventory, commercial exports',
                    color: 'text-blue-600',
                    bg: 'bg-blue-50 border-blue-200',
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
                          <CheckCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
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
                        <th className="text-left px-5 py-3 font-bold text-foreground/90 uppercase tracking-wider">Size</th>
                        <th className="text-left px-5 py-3 font-bold text-foreground/90 uppercase tracking-wider">Capacity</th>
                        <th className="text-left px-5 py-3 font-bold text-foreground/90 uppercase tracking-wider">Best For</th>
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
                  <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center mx-auto mb-3">
                    <f.icon size={20} />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1">{f.title}</h3>
                  <p className=" text-foreground leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>

            <div className="rounded-2xl bg-[#1a1a2e] border border-white/10 p-8 md:p-12 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#F59E0B]/0 via-[#F59E0B]/10 to-[#F59E0B]/0 animate-gradient-x opacity-60" />
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
                  Ready to ship <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F59E0B] via-orange-400 to-[#F59E0B] animate-gradient-x bg-[length:200%_auto]">by ocean?</span>
                </h2>
                <p className="text-lg text-white/85 max-w-lg mx-auto mb-8">
                  Get an instant quote or speak to our freight experts to plan your next shipment.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <a href="/quote" className="px-6 py-3 rounded-xl bg-[#F59E0B] text-white text-base font-semibold hover:bg-[#D97706] transition-colors inline-flex items-center gap-2">
                    Get a Quote <ArrowRight size={16} />
                  </a>
                  <a href="/contact" className="px-6 py-3 rounded-xl border border-white/20 text-white text-base font-semibold hover:bg-white/10 transition-colors inline-flex items-center gap-2">
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
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          animation: gradient-x 4s ease infinite;
        }
      `}</style>
    </div>
  );
}

