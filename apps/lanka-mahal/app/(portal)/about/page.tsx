'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Globe,
  Headphones,
  MapPin,
  Package,
  Phone,
  Shield,
  Star,
  Truck,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { PageHero } from '@/components/page/page-hero';
import { PageShell } from '@/components/page/page-section';
import { FaqSection } from '@/components/sections/faq-section';
import { useTenantConfig } from '@/lib/use-tenant-config';

const walkInSteps = [
  {
    step: '01',
    icon: Users,
    title: 'Walk In',
    desc: 'Bring your parcel to either Lanka Mahal branch. No appointment, no forms to fill beforehand.',
  },
  {
    step: '02',
    icon: Package,
    title: 'We Pack & Insure',
    desc: 'Our team packs it right in front of you. Fragile items get double-boxed. Transit insurance included.',
  },
  {
    step: '03',
    icon: Shield,
    title: 'Customs & Clearance',
    desc: 'All documentation and customs handling done in-house. You just drop off.',
  },
  {
    step: '04',
    icon: Globe,
    title: 'Delivered Worldwide',
    desc: 'Your parcel reaches 220+ countries. Track it in real time or get updates on WhatsApp.',
  },
];

const journeyCards = [
  { year: '2015', title: 'First Office', desc: 'A single room in Modara, Colombo. One phone line, one promise — international shipping made personal.' },
  { year: '2018', title: 'Jaffna Branch', desc: 'Northern Sri Lanka got its own branch. Same standard, same hands-on care, closer to more customers.' },
  { year: '2020', title: 'We Kept Shipping', desc: 'While the world shut down, we showed up. No missed deadlines, no lost parcels — when it mattered most.' },
  { year: '2022', title: '2,500 Parcels/Month', desc: 'From one room to shipping 2,500 parcels every month. Families, students, exporters — one roof, one standard.' },
  { year: '2024', title: 'Real-Time Tracking', desc: 'Live tracking and WhatsApp updates launched. The service stayed personal, the visibility went global.' },
  { year: 'Today', title: 'Still Growing', desc: 'Two branches, 220+ countries, and the same promise: walk in with a parcel, we handle the rest.' },
];

const whyUsItems = [
  { icon: Shield, text: 'In-branch packing — fragile items double-boxed before your eyes' },
  { icon: CheckCircle, text: 'Transit insurance included on every shipment' },
  { icon: Users, text: 'Walk-in service — same team, same faces, every visit' },
  { icon: Package, text: 'Customs documentation and clearance handled in-house' },
  { icon: Headphones, text: 'WhatsApp and phone support — real people, not chatbots' },
  { icon: CheckCircle, text: 'No hidden charges — the quoted price is what you pay' },
];

const testimonials = [
  {
    text: 'I walked into the Saidapet branch with a parcel for my son in London. They packed it, insured it, and gave me a tracking number in 10 minutes. It reached in 4 days.',
    name: 'Lakshmi R.',
    role: 'Parent, Colombo',
  },
  {
    text: 'We export garment samples to buyers in Germany. Lanka Mahal handles the customs paperwork and every shipment arrives on time. No complaints in 3 years.',
    name: 'Suresh M.',
    role: 'Garment Exporter',
  },
  {
    text: "I was nervous shipping my mother's medicines to Dubai. The team at Jaffna Branch explained every step. Parcel reached in 3 days, still cold-packed.",
    name: 'Farhan K.',
    role: "Student's Parent",
  },
  {
    text: 'Affordable rates, no hidden charges, and I can track my shipment on WhatsApp. Best courier service in Chennai for international parcels.',
    name: 'Deepa N.',
    role: 'Small Business Owner',
  },
  {
    text: 'I send homemade snacks to my daughter in Canada every month. Lanka Mahal has never lost a package or delayed one. That reliability matters.',
    name: 'Vijaya S.',
    role: 'Retired Teacher',
  },
  {
    text: 'As an electronics seller, I need careful handling. They double-box everything and the insurance is included. Never had a damaged shipment.',
    name: 'Karthik P.',
    role: 'Electronics Retailer',
  },
];

function TestimonialSlider(): ReactNode {
  const totalSlides = Math.ceil(testimonials.length / 3);
  const [slide, setSlide] = useState(0);

  const next = useCallback(() => setSlide((s) => (s + 1) % totalSlides), [totalSlides]);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  const slides = Array.from({ length: totalSlides }, (_, si) =>
    testimonials.slice(si * 3, si * 3 + 3),
  );

  return (
    <div className="relative">
      <div className="overflow-hidden">
        <motion.div
          animate={{ x: `-${slide * 100}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex"
        >
          {slides.map((group) => (
            <div
              key={group[0]?.name ?? group.length}
              className="min-w-0 w-full shrink-0 grid grid-cols-1 md:grid-cols-3 gap-6 px-0.5"
            >
              {group.map((t) => (
                <div
                  key={t.name}
                  className="rounded-2xl bg-white p-8 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex gap-1 mb-5">
                    {Array.from({ length: 5 }).map((_, si2) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: fixed star row
                      <Star key={si2} size={14} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-foreground text-base leading-relaxed mb-6">{t.text}</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-border/60">
                    <div className="w-9 h-9 rounded-full bg-brand-accent flex items-center justify-center text-sm font-semibold text-white">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <cite className="font-semibold not-italic text-foreground text-sm">
                        {t.name}
                      </cite>
                      <span className="text-sm text-foreground/70 block">{t.role}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </motion.div>
      </div>

      <div className="flex items-center justify-center gap-2 mt-8">
        {slides.map((group, i) => (
          <button
            key={`dot-${group[0]?.name ?? i}`}
            type="button"
            onClick={() => setSlide(i)}
            className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
              i === slide ? 'bg-brand-accent w-6' : 'bg-foreground/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function AboutPage(): ReactNode {
  const config = useTenantConfig();

  return (
    <PageShell>
      <PageHero
        image="/images/about.webp"
        eyebrow="About Us"
        title={
          <>
            Your trusted logistics partner,
            <br />
            <span className="text-brand-accent">delivering across 200+ countries.</span>
          </>
        }
        subtitle="From doorstep pickup near our offices to real-time tracking and on-time delivery, we help businesses and individuals ship with confidence worldwide."
        tall
      >
        <div className="mt-2 flex flex-wrap items-center gap-6">
          {[
            { value: '220+', label: 'Countries' },
            { value: '1 Lakh+', label: 'Parcels Delivered' },
            { value: '99.8%', label: 'On-Time' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs uppercase tracking-wider text-white/60">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a href="/register" className="premium-btn inline-flex items-center gap-1.5">
            Get Started <ArrowRight size={14} />
          </a>
          <a
            href="/track"
            className="premium-btn-ghost inline-flex items-center gap-1.5 border-white/30 text-white hover:bg-white/10"
          >
            Track a Shipment
          </a>
        </div>
      </PageHero>

      {/* Our Story — Editorial full-width */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-6">
                What began as a single office in Saidapet
                <br className="hidden md:block" />
                <span className="text-brand-accent"> has grown into eight branches across Sri Lanka.</span>
              </h2>
              <p className="text-lg text-foreground/70 leading-relaxed mb-4">
                Lanka Mahal is one of Chennai&apos;s most trusted international courier services,
                built to help families, students, and businesses send parcels, documents, and
                essentials overseas with ease and confidence.
              </p>
              <p className="text-lg text-foreground/70 leading-relaxed">
                We believe shipping is more than moving parcels — it&apos;s about delivering memories
                and keeping people connected across distances. Every shipment is handled with care,
                attention, and a commitment to making international delivery stress-free.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Walk-In Process — Horizontal steps */}
      <section className="bg-brand-cream">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              What happens when you <span className="text-brand-accent">walk in.</span>
            </h2>
            <p className="mt-3 text-base text-foreground/60 max-w-md mx-auto">
              No appointments, no online forms. Just walk in with your parcel.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {walkInSteps.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="relative bg-white rounded-2xl p-6 shadow-sm border border-border/40"
              >
                <span className="text-4xl font-black text-brand-accent/10 absolute top-4 right-4">
                  {s.step}
                </span>
                <div className="w-10 h-10 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center mb-4">
                  <s.icon className="size-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1.5">{s.title}</h3>
                <p className="text-sm text-foreground/60 leading-relaxed">{s.desc}</p>
                {i < walkInSteps.length - 1 && (
                  <ArrowRight className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-foreground/20 size-5 z-10" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Journey — 2x3 grid of cards */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent">
              <span className="h-px w-6 bg-brand-accent" />
              Our Journey
              <span className="h-px w-6 bg-brand-accent" />
            </span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              How Lanka Mahal <span className="text-brand-accent">grew.</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {journeyCards.map((m, i) => (
              <motion.div
                key={m.year}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="rounded-2xl border border-border/50 p-6 hover:border-brand-accent/30 transition-colors"
              >
                <span className="text-sm font-bold text-brand-accent tracking-wider">{m.year}</span>
                <h3 className="text-lg font-semibold text-foreground mt-2">{m.title}</h3>
                <p className="text-sm text-foreground/60 leading-relaxed mt-1.5">{m.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Us — Checklist style */}
      <section className="bg-brand-navy">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent mb-6">
                <span className="w-6 h-px bg-brand-accent" />
                Why Lanka Mahal
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.08] text-white">
                We pack it, insure it,
                <br />
                <span className="text-brand-accent">clear customs, and deliver.</span>
              </h2>
              <p className="text-base text-white/70 leading-relaxed max-w-sm">
                No middlemen, no runaround. Walk in or call — everything is handled under one roof.
              </p>
            </motion.div>

            <div className="space-y-4">
              {whyUsItems.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                  className="flex items-start gap-4 bg-white/5 rounded-xl p-4 backdrop-blur-sm border border-white/5"
                >
                  <div className="w-8 h-8 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center shrink-0 mt-0.5">
                    <item.icon className="size-4" />
                  </div>
                  <p className="text-sm text-white/85 leading-relaxed">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Our Branches */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent">
              <span className="h-px w-6 bg-brand-accent" />
              Our Branches
              <span className="h-px w-6 bg-brand-accent" />
            </span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Walk in <span className="text-brand-accent">any time.</span>
            </h2>
            <p className="mt-3 text-base text-foreground/60 max-w-md mx-auto">
              Eight branches across Sri Lanka. Walk in with your parcel, walk out with a tracking number.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {config.offices.map((office, i) => (
              <motion.div
                key={office.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-2xl border border-border/50 bg-brand-cream p-8"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-accent/10 text-brand-accent mb-5">
                  <MapPin size={20} />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{office.name}</h3>
                <p className="mt-2 text-sm text-foreground/60 leading-relaxed">{office.address}</p>
                <div className="mt-4 flex flex-col gap-2 text-sm text-foreground/70">
                  <span className="flex items-center gap-2">
                    <Clock size={14} className="shrink-0 text-brand-accent" />
                    {office.hours}
                  </span>
                  <span className="flex items-center gap-2">
                    <Phone size={14} className="shrink-0 text-brand-accent" />
                    {office.phones}
                  </span>
                </div>
                <a
                  href={`tel:${office.phones.split('/')[0]?.trim().replace(/\s/g, '') ?? ''}`}
                  className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-brand-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-accent-hover"
                >
                  <Phone size={14} />
                  Call Branch
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-brand-cream py-16 md:py-24 overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              What <span className="text-brand-accent">our customers say</span>
            </h2>
          </motion.div>

          <TestimonialSlider />
        </div>
      </section>

      <FaqSection />
    </PageShell>
  );
}
