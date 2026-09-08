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
import type { ReactNode } from 'react';
import { PageHero } from '@/components/page/page-hero';
import { PageSection, PageShell } from '@/components/page/page-section';
import { FaqSection } from '@/components/sections/faq-section';
import { SectionIntro } from '@/components/sections/section-intro';

const routes = [
  {
    flag: '🇨🇦',
    country: 'Canada',
    port: 'Toronto, Vancouver, Montreal',
    transit: '25–30 days',
    via: 'JNPT (Mumbai) → Colombo → Halifax/Vancouver',
    desc: 'Reliable ocean freight from India to Canadian ports with full customs support.',
  },
  {
    flag: '🇬🇧',
    country: 'United Kingdom',
    port: 'Felixstowe, Southampton, London',
    transit: '22–28 days',
    via: 'JNPT (Mumbai) → Suez → Felixstowe',
    desc: 'Regular LCL and FCL services to UK ports with door delivery options.',
  },
  {
    flag: '🇸🇬',
    country: 'Singapore',
    port: 'Singapore Port',
    transit: '10–14 days',
    via: 'Chennai / JNPT → Singapore',
    desc: 'Fast ocean freight to Singapore with frequent weekly sailings.',
  },
  {
    flag: '🇲🇾',
    country: 'Malaysia',
    port: 'Port Klang, Penang',
    transit: '12–16 days',
    via: 'Chennai / JNPT → Port Klang',
    desc: 'Cost-effective ocean shipping to Malaysia for commercial and personal cargo.',
  },
  {
    flag: '🇱🇰',
    country: 'Sri Lanka',
    port: 'Colombo Port',
    transit: '3–5 days',
    via: 'Chennai / Tuticorin → Colombo',
    desc: 'Short-sea freight to Sri Lanka with the fastest transit from Indian ports.',
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
    <PageShell>
      <PageHero
        image="/images/cargo-bg.webp"
        eyebrow="Ocean Freight"
        title={
          <>
            Ship by sea
            <br />
            <span className="text-brand-accent">across the globe.</span>
          </>
        }
        subtitle="Affordable LCL & FCL shipping from India to Canada, UK, Singapore, Malaysia, and Sri Lanka."
        tall
      />

      <PageSection>
        <div className="mx-auto max-w-5xl space-y-16 md:space-y-20">
          <p className="text-lg leading-relaxed text-foreground/90">
            Shipping large or heavy cargo internationally doesn&apos;t have to be complicated or
            expensive. Ocean freight is the smartest way to move bulk goods across borders. We take
            care of everything from India&apos;s major ports to doorsteps across{' '}
            <strong>Canada, UK, Singapore, Malaysia, and Sri Lanka</strong>.
          </p>

          <div>
            <SectionIntro
              eyebrow="Routes & Transit"
              title="Our ocean freight routes"
              subtitle="Fixed schedules, transparent transit times, and full port-to-door support on every lane."
            />
            <div className="mt-10 space-y-4">
              {routes.map((r, i) => (
                <motion.div
                  key={r.country}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  className="premium-card premium-card-hover p-5 md:p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-black/5 bg-brand-accent/5 text-xl">
                      {r.flag}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <h3 className="text-xl font-semibold text-foreground">{r.country}</h3>
                        <span className="rounded-full bg-brand-accent/10 px-3 py-0.5 text-sm font-semibold text-brand-accent">
                          {r.transit}
                        </span>
                      </div>
                      <p className="mb-2 leading-relaxed text-foreground/80">{r.desc}</p>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-foreground/70">
                        <span className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-brand-accent" /> {r.port}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Ship size={14} className="text-brand-accent" /> {r.via}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div>
            <SectionIntro
              eyebrow="Container Solutions"
              title="LCL & FCL container options"
              subtitle="Whether you're sending a few packages or a full container load, we'll find the right fit."
            />
            <div className="mt-10 grid gap-6 md:grid-cols-2">
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
                },
              ].map((option, i) => (
                <motion.div
                  key={option.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="premium-card p-6"
                >
                  <h3 className="mb-2 text-lg font-semibold text-foreground">{option.title}</h3>
                  <p className="mb-4 leading-relaxed text-foreground/80">{option.desc}</p>
                  <div className="mb-4 space-y-1.5">
                    {option.steps.map((s) => (
                      <div key={s} className="flex items-start gap-2 text-sm text-foreground/80">
                        <CheckCircle size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border pt-3 text-sm text-foreground/80">
                    <strong>Best for:</strong> {option.best}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="premium-card mt-8 overflow-hidden">
              <div className="border-b border-border p-5">
                <h3 className="text-lg font-semibold text-foreground">Available container sizes</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-brand-cream/50">
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-foreground/80">
                        Size
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-foreground/80">
                        Capacity
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-foreground/80">
                        Best For
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {containerOptions.map((c) => (
                      <tr key={c.size} className="border-b border-border last:border-b-0">
                        <td className="px-5 py-3 font-semibold text-foreground">{c.size}</td>
                        <td className="px-5 py-3 text-foreground/80">{c.capacity}</td>
                        <td className="px-5 py-3 text-foreground/80">{c.best}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="premium-card premium-card-hover p-5 text-center"
              >
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-accent/10 text-brand-accent">
                  <f.icon size={20} />
                </div>
                <h3 className="mb-1 text-base font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{f.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="premium-card relative overflow-hidden bg-gradient-to-br from-brand-navy to-[#152a45] p-8 text-center md:p-12">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-accent/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-brand-accent/10 blur-3xl" />
            <div className="relative z-10">
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Ready to ship <span className="text-brand-accent">by ocean?</span>
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-white/70">
                Get an instant quote or speak to our freight experts to plan your next shipment.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a href="/check-price" className="premium-btn inline-flex items-center gap-2">
                  Get a Quote <ArrowRight size={16} />
                </a>
                <a
                  href="/contact"
                  className="premium-btn-ghost inline-flex items-center gap-2 border-white/25 text-white hover:bg-white/10"
                >
                  Speak to an Expert
                </a>
              </div>
            </div>
          </div>
        </div>
      </PageSection>

      <FaqSection />
    </PageShell>
  );
}
