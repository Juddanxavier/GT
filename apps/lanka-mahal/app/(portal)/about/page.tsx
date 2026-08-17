'use client';

import type { ReactNode } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTenantConfig } from '@/lib/use-tenant-config';
import { Globe, Shield, Clock, Users, Truck, Package, ArrowUpRight, Star } from 'lucide-react';
import { FaqSection } from '@/components/sections/faq-section';

const milestones = [
  { year: '2010', title: 'Founded', desc: 'Started with a single office in Colombo and a vision to simplify international shipping for Sri Lankan families, students, and businesses. No hidden charges, no complicated processes - just reliable service.' },
  { year: '2012', title: 'First 10,000 Shipments', desc: 'Reached 10,000 successful shipments within two years of operation. Word-of-mouth referrals from satisfied customers drove rapid organic growth across the local community.' },
  { year: '2014', title: '50+ Locations', desc: 'Expanded to multiple locations across Sri Lanka, making international courier services accessible beyond Colombo. Regional towns gained doorstep pickup and delivery for the first time.' },
  { year: '2016', title: 'Airline Partnerships', desc: 'Secured direct partnerships with major international airlines, reducing transit times by up to 40%. Customers began seeing faster deliveries to the Middle East, Europe, and North America.' },
  { year: '2018', title: 'Digital Launch', desc: 'Launched real-time tracking, online booking, and 24/7 customer support. Customers could now track every scan point, book pickups from their phone, and get instant updates without calling.' },
  { year: '2020', title: 'Pandemic Response', desc: 'When international travel halted, we kept essential shipments moving. Medicines, documents, and relief parcels reached families across borders through rerouted logistics and government partnerships.' },
  { year: '2022', title: '200+ Countries', desc: 'Expanded to 200+ countries with strategic airline partnerships and local delivery fleets. Customs documentation, insurance, and compliance are now fully handled in-house.' },
  { year: '2024', title: '50K+ Annual Shipments', desc: 'Crossed 50,000 shipments a year with a 99.8% on-time delivery rate. Launched WhatsApp notifications and a dedicated mobile app for real-time tracking on the go.' },
  { year: '2026', title: 'Still Growing', desc: 'New services, faster delivery routes, and the same commitment to customer satisfaction that started it all. What began as one office is now a trusted partner for thousands of shippers worldwide.' },
];

const values = [
  { number: '01', icon: Globe, title: 'Global Network', desc: 'Delivering to 220+ countries with trusted partner networks across every continent.' },
  { number: '02', icon: Shield, title: 'Secure by Default', desc: 'Multi-layered security protocols and comprehensive transit insurance included.' },
  { number: '03', icon: Clock, title: 'Always On Time', desc: '99.8% on-time delivery rate across all international routes, every single day.' },
  { number: '04', icon: Users, title: 'Human Support', desc: 'Real people, not bots. Dedicated support that responds within hours.' },
];

const teamMembers = [
  { name: 'Nimal Perera', role: 'Founder & CEO', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80' },
  { name: 'Saman Kumara', role: 'Operations Head', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80' },
  { name: 'Thusitha Rodrigo', role: 'Logistics Director', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80' },
  { name: 'Dilani Fernando', role: 'Customer Success', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80' },
];

const testimonials = [
  { text: 'Lanka Mahal made sending a gift to my family in Colombo so easy. Tracking was live the whole way.', name: 'Kumari J.', role: 'Customer' },
  { text: 'We ship samples to clients globally. Reliable service and the team handles customs documentation for us.', name: 'Rohan D.', role: 'Business Owner' },
  { text: 'First time shipping internationally. They guided me through everything. Will use again.', name: 'Chaminda B.', role: 'First-time Shipper' },
  { text: 'Fast, reliable, and affordable. I have been using Lanka Mahal for all my business shipments for over 3 years.', name: 'Anura T.', role: 'Small Business Owner' },
  { text: 'The WhatsApp tracking updates are a lifesaver. I know exactly where my parcel is at all times.', name: 'Sneha R.', role: 'Customer' },
  { text: 'Best international courier service in Sri Lanka. Highly recommend for documents and parcels alike.', name: 'Priyanka J.', role: 'Customer' },
];

function Carousel3Col(): ReactNode {
  const totalSlides = Math.ceil(testimonials.length / 3);
  const [slide, setSlide] = useState(0);

  const next = useCallback(() => setSlide((s) => (s + 1) % totalSlides), [totalSlides]);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <div className="relative">
      <div className="overflow-hidden">
        <motion.div
          animate={{ x: `-${slide * 100}%` }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex"
        >
          {Array.from({ length: totalSlides }).map((_, si) => (
            <div key={si} className="min-w-0 w-full shrink-0 grid grid-cols-1 md:grid-cols-3 gap-6 px-0.5">
              {testimonials.slice(si * 3, si * 3 + 3).map((t) => (
                <div
                  key={t.name}
                  className="rounded-2xl bg-white p-8 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
                >
                  <div className="flex gap-1 mb-5">
                    {Array.from({ length: 5 }).map((_, si2) => (
                      <Star key={si2} size={14} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-foreground text-lg leading-relaxed mb-6">{t.text}</p>
                  <div className="flex items-center gap-3 pt-5 border-t border-border/60">
                    <div className="w-10 h-10 rounded-full bg-[#F59E0B] flex items-center justify-center text-base font-semibold text-white">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <cite className="font-semibold not-italic text-foreground text-base">{t.name}</cite>
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
        {Array.from({ length: totalSlides }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSlide(i)}
            className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
              i === slide ? 'bg-[#F59E0B] w-6' : 'bg-foreground/20'
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
      <section className="w-screen left-[calc(-50vw+50%)] relative overflow-hidden min-h-[450px] md:min-h-[600px] flex items-center bg-[#1a1a2e]">
        <div className="absolute inset-0">
          <img
            src="/images/about.png"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e] via-[#1a1a2e]/70 to-transparent" />
        </div>
        <div className="relative z-10 px-8 md:px-16 lg:px-24 pt-24 md:pt-28 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-6">
              <span className="w-6 h-px bg-[#F59E0B]" />
              About Us
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] text-white max-w-2xl">
              Connecting Sri Lanka
              <br />
              <span className="text-[#F59E0B]">to the world.</span>
            </h1>
            <p className="mt-5 text-lg text-white/90 max-w-md leading-relaxed">
              Trusted by families and businesses across Sri Lanka since 2010. We deliver parcels, documents, and essentials to 220+ countries.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-8">
              <a href="/register" className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full bg-[#F59E0B] text-white text-base font-semibold hover:bg-[#D97706] transition-colors cursor-pointer">
                Get Started <ArrowUpRight size={14} />
              </a>
              <a href="/track" className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full border border-white/30 text-white text-base font-semibold hover:bg-white/10 transition-colors cursor-pointer">
                Track a Shipment
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Our Story */}
      <section className="w-screen left-[calc(-50vw+50%)] relative bg-white">
        <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-16 md:py-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
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
                <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-4">
                  <span className="w-6 h-px bg-[#F59E0B]" />
                  Our Story
                </span>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
                  More than a courier. <span className="text-[#F59E0B]">A lifeline across borders.</span>
                </h2>
                <p className="text-lg text-foreground/90 leading-relaxed mb-6">
                  {config.name} is {config.originCountry}&apos;s trusted international courier service, built to help families, students, and businesses send parcels, gifts, and essentials overseas with ease and confidence.
                </p>
                <p className="text-lg text-foreground/90 leading-relaxed mb-8">
                  What began as a single office has grown into a logistics network spanning 220+ countries. Every shipment is handled with care, attention, and a commitment to making international delivery stress-free.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="w-screen left-[calc(-50vw+50%)] relative bg-[#1a1a2e] border-t border-white/10 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/heroparcel.png')] bg-fixed bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e]/90 via-[#1a1a2e]/60 to-[#1a1a2e]/90" />
        <div className="relative z-10 max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-16 md:py-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {[
              { value: '220+', label: 'Countries Served' },
              { value: '50K+', label: 'Shipments Yearly' },
              { value: '15+', label: 'Years of Trust' },
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
      <section className="w-screen left-[calc(-50vw+50%)] relative bg-white">
        <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-16 md:py-20">
          <div className="flex flex-col items-center text-center max-w-lg mx-auto mb-14">
            <div className="border border-border py-1 px-4 rounded-full text-base font-semibold tracking-wide uppercase text-foreground/85 bg-surface-secondary/50">
              What We Offer
            </div>
            <h2 className="mt-6 text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Built for reliability, <span className="text-[#F59E0B]">designed for trust.</span>
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
                <div className="w-14 h-14 rounded-2xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center mx-auto mb-5">
                  <v.icon className="size-6" />
                </div>
                <span className="text-xs font-bold text-[#F59E0B] tracking-wider block mb-2">{v.number}</span>
                <h3 className="text-lg font-semibold text-foreground mb-1.5">{v.title}</h3>
                <p className="text-lg text-foreground/90 leading-relaxed max-w-xs mx-auto">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey */}
      <section className="w-screen left-[calc(-50vw+50%)] relative bg-white">
        <div className="max-w-5xl mx-auto px-8 md:px-16 lg:px-24 py-16 md:py-20">
          <div className="flex flex-col items-center text-center max-w-lg mx-auto mb-14">
            <div className="border border-border py-1 px-4 rounded-full text-base font-semibold tracking-wide uppercase text-foreground/85 bg-surface-secondary/50">
              Our Journey
            </div>
            <h2 className="mt-6 text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              15 years <span className="text-[#F59E0B]">of trust.</span>
            </h2>
          </div>
          <div className="relative">
            <div className="absolute left-[23px] md:left-1/2 top-2 bottom-2 w-0.5 bg-[#F59E0B]/20 md:-translate-x-px" />
            <div className="flex flex-col gap-10">
              {milestones.map((m, i) => (
                <motion.div
                  key={m.year}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className={`relative flex items-start gap-6 md:gap-0 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                >
                  <div className="hidden md:flex md:w-1/2 md:items-center md:justify-center">
                    {i % 2 === 0 ? (
                      <div className="text-right pr-10">
                        <p className="text-5xl font-bold text-[#F59E0B]/15 tracking-tight">{m.year}</p>
                      </div>
                    ) : (
                      <div className="pl-10">
                        <p className="text-5xl font-bold text-[#F59E0B]/15 tracking-tight">{m.year}</p>
                      </div>
                    )}
                  </div>
                  <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-[#F59E0B] text-white shrink-0 shadow-md md:absolute md:left-1/2 md:-translate-x-1/2">
                    <p className="text-xs font-bold">{m.year.slice(2)}</p>
                  </div>
                  <div className="md:w-1/2 md:pl-10 md:pr-0">
                    <div className="md:hidden font-bold text-[#F59E0B] mb-1">{m.year}</div>
                    <h3 className="text-lg font-semibold text-foreground">{m.title}</h3>
                    <p className="text-lg text-foreground/90 leading-relaxed mt-1">{m.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Businesses Trust Us */}
      <section className="w-screen left-[calc(-50vw+50%)] relative bg-[#1a1a2e] overflow-hidden">
        <div className="absolute inset-0 bg-fixed bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1400&q=80')" }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e]/90 via-[#1a1a2e]/60 to-[#1a1a2e]/90" />
        <div className="relative z-10 max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-16 md:py-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            <div className="flex flex-col justify-center">
              <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-4">
                <span className="w-6 h-px bg-[#F59E0B]" />
                Our Edge
              </span>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-[1.15] mb-4">
                Why businesses <span className="text-[#F59E0B]">trust us.</span>
              </h2>
              <p className="text-lg text-white/85 leading-relaxed max-w-md">
                We combine global infrastructure with local expertise to deliver a shipping experience that&apos;s reliable, transparent, and human.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Truck, title: 'Strong Network', desc: 'Strategic airline partnerships and local delivery fleets across 220+ countries.' },
                { icon: Shield, title: 'Secure Logistics', desc: 'Multi-layered security protocols and comprehensive transit insurance.' },
                { icon: Users, title: 'Dedicated Support', desc: '24/7 human-led assistance for every shipping query.' },
                { icon: Package, title: 'Real-time Tracking', desc: 'Live status updates with milestone alerts at every scan point.' },
              ].map((e, i) => (
                <motion.div
                  key={e.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center mb-3">
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

      {/* Team */}
      <section className="w-screen left-[calc(-50vw+50%)] relative bg-surface">
        <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-16 md:py-20">
          <div className="flex flex-col items-center text-center max-w-lg mx-auto mb-12">
            <div className="border border-border py-1 px-4 rounded-full text-base font-semibold tracking-wide uppercase text-foreground/85 bg-surface-secondary/50">
              Our Team
            </div>
            <h2 className="mt-6 text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              The people behind <span className="text-[#F59E0B]">the parcels.</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamMembers.map((m, i) => (
              <motion.div
                key={m.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
              >
                <div className="aspect-square">
                  <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e]/80 via-[#1a1a2e]/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-lg font-semibold text-white">{m.name}</h3>
                  <p className="text-lg text-white/90">{m.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="w-screen left-[calc(-50vw+50%)] relative bg-surface py-16 md:py-20 overflow-hidden">
        <div className="max-w-6xl mx-auto px-8 md:px-16 lg:px-24">
          <div className="flex flex-col items-center text-center max-w-lg mx-auto mb-12">
            <div className="border border-border py-1 px-4 rounded-full text-base font-semibold tracking-wide uppercase text-foreground/85 bg-surface-secondary/50">
              Testimonials
            </div>
            <h2 className="mt-6 text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              What <span className="text-[#F59E0B]">our users say</span>
            </h2>
          </div>

          <Carousel3Col />
        </div>
      </section>

      <FaqSection />
    </div>
  );
}

