'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Zap, Rocket, Wallet, Globe, Truck, Shield, Clock, Headphones, PackageSearch, ArrowRight, CheckCircle, Calendar, Plane } from 'lucide-react';
import { FaqSection } from '@/components/sections/faq-section';

const plans = [
  {
    icon: Zap,
    tag: '3–5 days',
    title: 'Lanka Mahal Express Priority',
    desc: 'Our fastest express service for time-sensitive shipments. Direct flight operations from major airports deliver your parcel worldwide with the shortest possible transit time.',
    bestFor: 'Urgent documents, gifts, time-sensitive shipments',
    benefit: 'Direct air routing - fastest international delivery',
    featured: true,
    color: {
      chip: 'bg-[#F59E0B] text-white',
      tag: 'text-[#F59E0B]',
      check: 'text-[#F59E0B]',
      btn: 'bg-[#F59E0B] hover:bg-[#D97706]',
    },
  },
  {
    icon: Rocket,
    tag: '3–7 days',
    title: 'Lanka Mahal Express Saver',
    desc: 'A reliable express option for everyday shipments - consistent worldwide delivery without the premium price tag of urgent services.',
    bestFor: 'Gift parcels, regular personal shipments',
    benefit: 'Reliable delivery at affordable rates',
    featured: false,
    color: {
      chip: 'bg-[#F59E0B]/10 text-[#F59E0B]',
      tag: 'text-[#F59E0B]',
      check: 'text-[#F59E0B]',
      btn: 'bg-[#F59E0B] hover:bg-[#D97706]',
    },
  },
  {
    icon: Globe,
    tag: '4–7 days',
    title: 'Lanka Mahal Express Edge',
    desc: 'A region-focused express service for shipments to the Middle East, Africa, Europe, and Asia - with lane-optimised routing for better cost and reliable delivery.',
    bestFor: 'Shipments to EMEA and Asian corridors',
    benefit: 'Region-specific routing, better rates',
    featured: false,
    color: {
      chip: 'bg-[#F59E0B]/10 text-[#F59E0B]',
      tag: 'text-[#F59E0B]',
      check: 'text-[#F59E0B]',
      btn: 'bg-[#F59E0B] hover:bg-[#D97706]',
    },
  },
  {
    icon: Wallet,
    tag: '8–12 days',
    title: 'Lanka Mahal Express Economy',
    desc: 'Low-cost express delivery for everyday parcels, student shipments, and personal packages - fast shipping at the most affordable rates.',
    bestFor: 'Students, first-time shippers, bulk parcels',
    benefit: 'Lowest international courier charges',
    featured: false,
    color: {
      chip: 'bg-[#F59E0B]/10 text-[#F59E0B]',
      tag: 'text-[#F59E0B]',
      check: 'text-[#F59E0B]',
      btn: 'bg-[#F59E0B] hover:bg-[#D97706]',
    },
  },
  {
    icon: Truck,
    tag: '10–15 days',
    title: 'Lanka Mahal Express Standard',
    desc: 'Budget-friendly shipping for non-urgent parcels. Reliable delivery with full tracking at the most economical rates.',
    bestFor: 'Non-urgent parcels, bulk shipments, cost-conscious shippers',
    benefit: 'Most affordable option with full tracking',
    featured: false,
    color: {
      chip: 'bg-[#F59E0B]/10 text-[#F59E0B]',
      tag: 'text-[#F59E0B]',
      check: 'text-[#F59E0B]',
      btn: 'bg-[#F59E0B] hover:bg-[#D97706]',
    },
  },
];

const stats = [
  { value: 'Daily', label: 'Air uplift operations' },
  { value: '220+', label: 'Countries served' },
  { value: '3–5', label: 'Days express delivery' },
  { value: '24/7', label: 'Customer support' },
];

const process = [
  { icon: Calendar, title: 'Book your pickup', desc: 'Schedule a doorstep pickup online in under a minute - or drop off at any branch.' },
  { icon: PackageSearch, title: 'We pack & clear', desc: 'Professional packing with customs documentation handled end-to-end.' },
  { icon: Plane, title: 'Daily uplift flights', desc: 'Your parcel boards a flight the same day or next morning - no waiting for backlogs.' },
  { icon: Truck, title: 'Delivered to doorstep', desc: 'Track it live from pickup to delivery, with a signature on arrival.' },
];

const strengths = [
  { icon: Plane, title: 'Daily air uplift operations', desc: 'Your parcel moves every day - no waiting, no backlogs. Daily flights mean faster shipping.' },
  { icon: Globe, title: '220+ global destinations', desc: 'Fast international shipping to major destinations worldwide with smooth, reliable express coverage.' },
  { icon: PackageSearch, title: 'Real-time tracking', desc: 'Track your express delivery live - from pickup to doorstep with updates at every stage.' },
  { icon: Truck, title: 'Doorstep pickup', desc: 'Book a convenient pickup from your home or office - or drop off at the nearest branch.' },
  { icon: Headphones, title: '24/7 customer support', desc: 'Get help whenever you need it. Our support team is available around the clock.' },
  { icon: Shield, title: 'Secure packing support', desc: 'Trained professionals carefully pack fragile, valuable, and important shipments.' },
];

export default function AirFreightPage(): ReactNode {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden min-h-[560px] md:min-h-[640px] flex items-center bg-[#1a1a2e]">
        <div className="absolute inset-0">
          <img src="/images/heroparcel.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e]/85 via-[#1a1a2e]/45 to-[#1a1a2e]/15" />
        </div>
        <div className="relative z-10 px-5 sm:px-8 md:px-16 lg:px-24 w-full py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl"
          >
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-4">
              <span className="w-6 h-px bg-[#F59E0B]" />
              Air Freight
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.08] text-white">
              Air freight, <span className="text-[#F59E0B]">done right.</span>
            </h1>
            <p className="mt-5 text-lg text-white/80 max-w-xl leading-relaxed">
              Fast international shipping to 200+ countries with daily uplift operations and delivery in as little as 3 days.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <a href="/quote" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#F59E0B] text-white text-base font-semibold hover:bg-[#D97706] transition-colors cursor-pointer">
                Check Price <ArrowRight size={16} />
              </a>
              <a href="/pickup" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/30 text-white text-base font-semibold hover:bg-white/10 transition-colors cursor-pointer">
                Schedule Pickup
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Intro */}
      <section className="relative bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <div className="max-w-3xl">
            <p className="text-lg text-foreground/90 leading-relaxed mb-8">
              Fast international shipping to <strong>200+ countries</strong>. With daily air uplift operations, multiple pickup locations, and delivery to major destinations in just <strong>3–5 days</strong>, shipping overseas has never been simpler or more reliable.
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { icon: Truck, label: 'Same-day pickup available' },
                { icon: Shield, label: 'Fully insured shipments' },
                { icon: Globe, label: 'Customs handled end-to-end' },
                { icon: Clock, label: '4.8★ rated on Google' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface/50 border border-border text-sm font-medium text-foreground/80">
                  <item.icon size={14} className="text-[#F59E0B]" />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="relative bg-gradient-to-b from-white to-[#fdf8f0]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-4">
            <span className="w-6 h-px bg-[#F59E0B]" />
            Our Plans
          </span>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-[1.15] mb-2">
            Choose the shipping speed <span className="text-[#F59E0B]">that fits your needs</span>
          </h2>
          <p className="text-lg text-foreground/85 mb-10 max-w-2xl">
            From urgent international shipments to budget-friendly parcel delivery, every plan includes real-time tracking, secure handling, doorstep pickup, and 24/7 support.
          </p>

          {(() => {
            const featured = plans.find((p) => p.featured)!;
            const rest = plans.filter((p) => !p.featured);
            return (
              <div className="space-y-6">
                {/* Featured plan */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4 }}
                  className="rounded-2xl bg-[#1a1a2e] border border-white/10 p-6 md:p-8 grid md:grid-cols-[auto_1fr_auto] gap-6 items-center relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#F59E0B]/15 via-transparent to-transparent" />
                  <div className={`relative z-10 w-14 h-14 rounded-2xl ${featured.color.chip} flex items-center justify-center shrink-0`}>
                    <featured.icon size={26} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-white bg-[#F59E0B] px-2.5 py-0.5 rounded-full">Most Popular</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-white/60">Delivery in {featured.tag}</span>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-white mb-1">{featured.title}</h3>
                    <p className="text-sm text-white/70 leading-relaxed max-w-2xl">{featured.desc}</p>
                  </div>
                  <a href="/quote" className={`relative z-10 inline-flex items-center gap-1.5 px-6 py-3 rounded-full ${featured.color.btn} text-white text-sm font-bold transition-colors w-fit`}>
                    Check Price <ArrowRight size={14} />
                  </a>
                </motion.div>

                {/* Remaining plans */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {rest.map((plan, i) => (
                    <motion.div
                      key={plan.title}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.06, duration: 0.4 }}
                      className="rounded-2xl border border-border bg-white p-5 flex flex-col"
                    >
                      <div className={`w-10 h-10 rounded-xl ${plan.color.chip} flex items-center justify-center mb-3`}>
                        <plan.icon size={20} />
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-wider ${plan.color.tag} mb-2`}>{plan.tag}</span>
                      <h3 className="text-base font-bold text-foreground mb-1.5">{plan.title}</h3>
                      <p className="text-sm text-foreground/80 leading-relaxed mb-3 flex-1">{plan.desc}</p>
                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-start gap-1.5 text-sm text-foreground/80">
                          <CheckCircle size={16} className={`${plan.color.check} shrink-0 mt-0.5`} />
                          <span><strong>Best for:</strong> {plan.bestFor}</span>
                        </div>
                        <div className="flex items-start gap-1.5 text-sm text-foreground/80">
                          <CheckCircle size={16} className={`${plan.color.check} shrink-0 mt-0.5`} />
                          <span><strong>Benefit:</strong> {plan.benefit}</span>
                        </div>
                      </div>
                      <a href="/quote" className={`mt-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${plan.color.btn} text-white text-xs font-bold transition-colors w-fit`}>
                        Check Price <ArrowRight size={12} />
                      </a>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* How it works */}
      <section className="relative bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <div className="max-w-2xl mb-12">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-4">
              <span className="w-6 h-px bg-[#F59E0B]" />
              How It Works
            </span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-[1.15]">
              From your doorstep to <span className="text-[#F59E0B]">theirs, in days</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {process.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
                className="relative rounded-2xl border border-border bg-surface/50 p-6"
              >
                <span className="absolute top-4 right-5 text-5xl font-bold text-foreground/[0.06] select-none">0{i + 1}</span>
                <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center mb-4">
                  <s.icon size={20} />
                </div>
                <h3 className="text-base font-bold text-foreground mb-1.5">{s.title}</h3>
                <p className="text-sm text-foreground/80 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="relative bg-[#1a1a2e] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/ctaabout.png')] bg-cover bg-center opacity-10" />
        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-4">
            <span className="w-6 h-px bg-[#F59E0B]" />
            Why Lanka Mahal
          </span>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-[1.15] mb-10 max-w-2xl">
            Why thousands choose us for <span className="text-[#F59E0B]">express delivery</span>
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="text-center lg:text-left"
              >
                <p className="text-3xl md:text-4xl font-bold text-white">{s.value}</p>
                <p className="text-white/60 mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {strengths.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-sm hover:bg-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center mb-3">
                  <s.icon size={20} />
                </div>
                <h3 className="text-base font-bold text-white mb-1.5">{s.title}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <div className="rounded-2xl bg-[#1a1a2e] border border-white/10 p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute -top-20 -left-20 w-60 h-60 bg-[#F59E0B]/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-[#FBBF24]/15 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-3">
                Ship Faster. <span className="text-[#F59E0B]">Ship Smarter.</span>
              </h2>
              <p className="text-lg text-white/85 max-w-lg mx-auto mb-8">
                Get an instant quote, find a branch, or schedule a pickup - whatever works for you.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <a href="/quote" className="px-6 py-3 rounded-full bg-[#F59E0B] text-white text-base font-semibold hover:bg-[#D97706] transition-colors inline-flex items-center gap-2">
                  Check Price <ArrowRight size={16} />
                </a>
                <a href="/pickup" className="px-6 py-3 rounded-full border border-white/20 text-white text-base font-semibold hover:bg-white/10 transition-colors inline-flex items-center gap-2">
                  Schedule Pickup
                </a>
                <a href="/branches" className="px-6 py-3 rounded-full border border-white/20 text-white text-base font-semibold hover:bg-white/10 transition-colors inline-flex items-center gap-2">
                  Find a Branch
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FaqSection />
    </div>
  );
}
