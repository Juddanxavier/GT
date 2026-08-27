'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, Clock, Globe, MapPin, Package, Phone, Shield, Star, Truck, Users } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { FaqSection } from '@/components/sections/faq-section';
import { useTenantConfig } from '@/lib/use-tenant-config';

const values = [
  {
    number: '01',
    icon: Globe,
    title: 'Global Reach',
    desc: 'Delivering to 220+ countries through airline contracts and local delivery partners.',
  },
  {
    number: '02',
    icon: Shield,
    title: 'Insured & Secure',
    desc: 'Every parcel is insured in transit. Fragile items double-packed at our branches.',
  },
  {
    number: '03',
    icon: Clock,
    title: 'On-Time Delivery',
    desc: '99.8% on-time rate across all international routes — year after year.',
  },
  {
    number: '04',
    icon: Users,
    title: 'Walk-In Support',
    desc: 'Visit either Chennai branch or call us. Real people, same team, every time.',
  },
];

const testimonials = [
  {
    text: 'I walked into the Saidapet branch with a parcel for my son in London. They packed it, insured it, and gave me a tracking number in 10 minutes. It reached in 4 days.',
    name: 'Lakshmi R.',
    role: 'Parent, Chennai',
  },
  {
    text: 'We export garment samples to buyers in Germany. Gajan Traders handles the customs paperwork and every shipment arrives on time. No complaints in 3 years.',
    name: 'Suresh M.',
    role: 'Garment Exporter',
  },
  {
    text: 'I was nervous shipping my mother\'s medicines to Dubai. The team at Royapuram branch explained every step. Parcel reached in 3 days, still cold-packed.',
    name: 'Farhan K.',
    role: 'Student\'s Parent',
  },
  {
    text: 'Affordable rates, no hidden charges, and I can track my shipment on WhatsApp. Best courier service in Chennai for international parcels.',
    name: 'Deepa N.',
    role: 'Small Business Owner',
  },
  {
    text: 'I send homemade snacks to my daughter in Canada every month. Gajan Traders has never lost a package or delayed one. That reliability matters.',
    name: 'Vijaya S.',
    role: 'Retired Teacher',
  },
  {
    text: 'As an electronics seller, I need careful handling. They double-box everything and the insurance is included. Never had a damaged shipment.',
    name: 'Karthik P.',
    role: 'Electronics Retailer',
  },
];

function Carousel3Col(): ReactNode {
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
                  <p className="text-foreground text-lg leading-relaxed mb-6">{t.text}</p>
                  <div className="flex items-center gap-3 pt-5 border-t border-border/60">
                    <div className="w-10 h-10 rounded-full bg-[#F94735] flex items-center justify-center text-base font-semibold text-white">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <cite className="font-semibold not-italic text-foreground text-base">
                        {t.name}
                      </cite>
                      <span className="text-base text-foreground/85 block">{t.role}</span>
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
              i === slide ? 'bg-[#F94735] w-6' : 'bg-foreground/20'
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
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden min-h-[500px] md:min-h-[600px] flex items-center bg-[#1a1a2e]">
        <div className="absolute inset-0">
          <Image src="/images/about.webp" alt="" fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e]/85 via-[#1a1a2e]/45 to-[#1a1a2e]/15" />
        </div>
        <div className="relative z-10 px-5 sm:px-8 md:px-16 lg:px-24 pt-24 md:pt-28 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#F94735] mb-6">
              <span className="w-6 h-px bg-[#F94735]" />
              About Us
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.08] text-white max-w-2xl">
              A real courier service,
              <br />
              <span className="text-[#F94735]">not a software platform.</span>
            </h1>
            <p className="mt-5 text-base text-white/75 max-w-md leading-relaxed">
              Two branches in Chennai, real staff, real handshakes. Walk in with a parcel, we handle
              the rest — packing, customs, delivery to 220+ countries.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-8">
              <a
                href="/register"
                className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full bg-[#F94735] text-white text-base font-semibold hover:bg-[#D83220] transition-colors cursor-pointer"
              >
                Get Started <ArrowUpRight size={14} />
              </a>
              <a
                href="/track"
                className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full border border-white/30 text-white text-base font-semibold hover:bg-white/10 transition-colors cursor-pointer"
              >
                Track a Shipment
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Our Story */}
      <section className="relative bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="relative h-72 md:h-96 rounded-2xl overflow-hidden"
              >
                <Image
                  src="/images/story.webp"
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </motion.div>
            </div>
            <div className="flex flex-col">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#F94735] mb-4">
                  <span className="w-6 h-px bg-[#F94735]" />
                  Our Story
                </span>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
                  Not a platform.{' '}
                  <span className="text-[#F94735]">A family-run courier you can walk into.</span>
                </h2>
                <p className="text-lg text-foreground/90 leading-relaxed mb-6">
                  {config.name} started in 2016 from a single office in Chennai. We are not a tech
                  company or a marketplace — we are a physical courier service with real branches,
                  real staff, and real handshakes.
                </p>
                <p className="text-lg text-foreground/90 leading-relaxed mb-8">
                  Families walk in with parcels for their children abroad. Exporters drop off samples
                  for overseas buyers. Students send documents and medicines. We pack it, insure it,
                  clear customs, and track it — from our counter to their doorstep in 220+ countries.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative bg-[#1a1a2e] border-t border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/heroparcel.webp')] bg-fixed bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e]/90 via-[#1a1a2e]/60 to-[#1a1a2e]/90" />
        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {[
              { value: '220+', label: 'Countries Served' },
              { value: '2', label: 'Branches in Chennai' },
              { value: '10+', label: 'Years of Trust' },
              { value: '99.8%', label: 'On-Time Rate' },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="text-center"
              >
                <p className="text-3xl md:text-4xl font-bold text-white mb-1">{s.value}</p>
                <p className=" text-white/85">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Offer */}
      <section className="relative bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <div className="flex flex-col items-center text-center max-w-lg mx-auto mb-14">
            <div className="border border-border py-1 px-4 rounded-full text-base font-semibold tracking-wide uppercase text-foreground/85 bg-surface-secondary/50">
              What We Offer
            </div>
            <h2 className="mt-6 text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Built for reliability, <span className="text-[#F94735]">designed for trust.</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#F94735]/10 text-[#F94735] flex items-center justify-center mx-auto mb-5">
                  <v.icon className="size-6" />
                </div>
                <span className="text-xs font-bold text-[#F94735] tracking-wider block mb-2">
                  {v.number}
                </span>
                <h3 className="text-lg font-semibold text-foreground mb-1.5">{v.title}</h3>
                <p className="text-lg text-foreground/90 leading-relaxed max-w-xs mx-auto">
                  {v.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Branches */}
      <section className="relative bg-surface">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <div className="flex flex-col items-center text-center max-w-lg mx-auto mb-14">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#F94735]">
              <span className="h-px w-6 bg-[#F94735]" />
              Our Branches
            </span>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Walk in <span className="text-[#F94735]">any time.</span>
            </h2>
            <p className="mt-3 text-base text-foreground/70 max-w-md">
              Two branches in Chennai. Walk in with your parcel, walk out with a tracking number.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {config.offices.map((office, i) => (
              <motion.div
                key={office.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-2xl border border-border/50 bg-white p-8 shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F94735]/10 text-[#F94735] mb-5">
                  <MapPin size={20} />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{office.name}</h3>
                <p className="mt-2 text-base text-foreground/70 leading-relaxed">{office.address}</p>
                <div className="mt-4 flex flex-col gap-2 text-sm text-foreground/80">
                  <span className="flex items-center gap-2">
                    <Clock size={14} className="shrink-0 text-[#F94735]" />
                    {office.hours}
                  </span>
                  <span className="flex items-center gap-2">
                    <Phone size={14} className="shrink-0 text-[#F94735]" />
                    {office.phones}
                  </span>
                </div>
                <a
                  href={`tel:${office.phones.split('/')[0].trim().replace(/\s/g, '')}`}
                  className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#F94735] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#D83220]"
                >
                  <Phone size={14} />
                  Call Branch
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Businesses Trust Us */}
      <section className="relative bg-[#1a1a2e] overflow-hidden">
        <div
          className="absolute inset-0 bg-fixed bg-cover bg-center"
          style={{
            backgroundImage: "url('/images/cargo-bg.webp')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e]/90 via-[#1a1a2e]/60 to-[#1a1a2e]/90" />
        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            <div className="flex flex-col justify-center">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#F94735] mb-4">
                <span className="w-6 h-px bg-[#F94735]" />
                Our Edge
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-[1.15] mb-4">
                Why Chennai <span className="text-[#F94735]">trusts us.</span>
              </h2>
              <p className="text-lg text-white/85 leading-relaxed max-w-md">
                Two branches. One standard. Walk in or call — we pack, insure, clear customs, and
                deliver. No middlemen, no runaround.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  icon: Truck,
                  title: 'Direct Airline Contracts',
                  desc: 'No middlemen. We contract directly with airlines for faster, cheaper delivery.',
                },
                {
                  icon: Shield,
                  title: 'In-Branch Packing',
                  desc: 'Fragile items double-packed on the spot. Transit insurance included.',
                },
                {
                  icon: Users,
                  title: 'Walk-In Service',
                  desc: 'Visit Saidapet or Royapuram. Same team, same faces, every visit.',
                },
                {
                  icon: Package,
                  title: 'Customs Handled',
                  desc: 'We handle documentation and clearance in-house. You just drop off.',
                },
              ].map((e, i) => (
                <motion.div
                  key={e.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#F94735]/10 text-[#F94735] flex items-center justify-center mb-3">
                    <e.icon className="size-4" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-0.5">{e.title}</h3>
                  <p className="text-lg text-white/85 leading-relaxed">{e.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative bg-surface py-16 md:py-24 overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24">
          <div className="flex flex-col items-center text-center max-w-lg mx-auto mb-12">
            <div className="border border-border py-1 px-4 rounded-full text-base font-semibold tracking-wide uppercase text-foreground/85 bg-surface-secondary/50">
              Testimonials
            </div>
            <h2 className="mt-6 text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              What <span className="text-[#F94735]">our users say</span>
            </h2>
          </div>

          <Carousel3Col />
        </div>
      </section>

      <FaqSection />
    </div>
  );
}
