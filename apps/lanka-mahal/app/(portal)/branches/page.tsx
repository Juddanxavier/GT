'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Building2, Clock, Users, Package, Globe, ArrowUpRight, ChevronDown, PhoneCall, Navigation } from 'lucide-react';

const branches = [
  {
    name: 'Head Office (Modara)',
    city: 'Colombo 15',
    region: 'Western',
    address: ['40B, St Jems Street, Modara,', 'Colombo 15,', 'Sri Lanka.'],
    phone: ['074 030 0976', '077 839 3974', '011 252 5398'],
    hours: 'Mon–Sat, 9 AM – 6 PM',
    headOffice: true,
  },
  {
    name: 'Jaffna',
    city: 'Jaffna',
    region: 'North',
    address: ['40, Kannathiddy Road,', 'Jaffna,', 'Sri Lanka.'],
    phone: ['077 839 3974', '077 158 0268', '021 221 0153'],
    hours: 'Mon–Sat, 9 AM – 6 PM',
    headOffice: false,
  },
  {
    name: 'Kilinochchi',
    city: 'Kilinochchi',
    region: 'North',
    address: ['56/B, A9 Road, Ananthapuram,', 'Kilinochchi,', 'Sri Lanka.'],
    phone: ['074 194 3697', '077 839 3974', '021 228 2848'],
    hours: 'Mon–Sat, 9 AM – 6 PM',
    headOffice: false,
  },
  {
    name: 'Vavuniya',
    city: 'Vavuniya',
    region: 'North',
    address: ['65, 2nd Cross Street,', 'Vavuniya,', 'Sri Lanka.'],
    phone: ['074 074 7804', '077 839 3974', '024 222 6566'],
    hours: 'Mon–Sat, 9 AM – 6 PM',
    headOffice: false,
  },
  {
    name: 'Trincomalee',
    city: 'Trincomalee',
    region: 'East',
    address: ['361B, Power House Road,', 'Trincomalee,', 'Sri Lanka.'],
    phone: ['074 194 3678', '077 839 3974', '026 222 8285'],
    hours: 'Mon–Sat, 9 AM – 6 PM',
    headOffice: false,
  },
  {
    name: 'Mullaitivu',
    city: 'Mullaitivu',
    region: 'North',
    address: ['Paranthan Road, Putukudiyiruppu,', 'Mullaitivu,', 'Sri Lanka.'],
    phone: ['074 194 3699', '077 839 3974', '021 229 0410'],
    hours: 'Mon–Sat, 9 AM – 6 PM',
    headOffice: false,
  },
  {
    name: 'Mannar',
    city: 'Mannar',
    region: 'North',
    address: ["St. Sebastian's Street, Hospital Road,", 'Mannar,', 'Sri Lanka.'],
    phone: ['074 074 7661', '077 839 3974', '023 222 3687'],
    hours: 'Mon–Sat, 9 AM – 6 PM',
    headOffice: false,
  },
  {
    name: 'Batticaloa',
    city: 'Batticaloa',
    region: 'East',
    address: ['569, Trinco Road,', 'Batticaloa,', 'Sri Lanka.'],
    phone: ['074 194 3698', '077 839 3974', '065 222 7995'],
    hours: 'Mon–Sat, 9 AM – 6 PM',
    headOffice: false,
  },
];

const services = [
  { icon: Package, title: 'Parcel Booking', desc: 'Ship documents and parcels to 220+ countries from any branch.' },
  { icon: Globe, title: 'Customs Support', desc: 'In-house documentation and customs clearance assistance.' },
  { icon: Clock, title: 'Real-time Tracking', desc: 'Live tracking updates from drop-off to delivery.' },
  { icon: Users, title: 'Walk-in Support', desc: 'Friendly staff to help with quotes, forms, and queries.' },
];

const branchFaqs = [
  { q: 'What are your branch timings?', a: 'All our branches are open Mon–Sat, 9 AM to 6 PM. All locations are closed on Sundays and public holidays.' },
  { q: 'Can I drop off a prepaid shipment at any branch?', a: 'Yes. You can drop off prepaid shipments at any of our branches. Make sure your airway bill is attached and the package is properly sealed.' },
  { q: 'Do I need an appointment to visit?', a: 'No appointment is needed. Walk-ins are welcome during working hours. For bulky shipments or specialized queries, calling ahead is recommended.' },
  { q: 'Can I collect my shipment from a branch?', a: 'Yes. If you miss a delivery or prefer self-collection, your shipment can be redirected to your nearest branch. Contact our support team to arrange this.' },
  { q: 'What payment methods do you accept?', a: 'We accept cash, bank transfers, and card payments at all branch locations.' },
];

function BranchCard({ b, i }: { b: (typeof branches)[number]; i: number }): ReactNode {
  const dark = b.headOffice;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: i * 0.06, duration: 0.4 }}
      className={`rounded-2xl border p-7 flex flex-col ${dark
        ? 'md:col-span-2 bg-[#1a1a2e] border-white/10'
        : 'bg-white border-border shadow-[0_2px_12px_rgba(0,0,0,0.04)]'}`}
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${dark ? 'bg-[#F59E0B] text-white' : 'bg-[#F59E0B]/10 text-[#F59E0B]'}`}>
          <Building2 className="size-6" />
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          {b.headOffice && (
            <span className="text-xs font-bold uppercase tracking-wider text-white bg-[#F59E0B] px-2.5 py-1 rounded-full">Head Office</span>
          )}
          <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${dark ? 'text-white/60 bg-white/10' : 'text-foreground/60 bg-surface'}`}>
            {b.region} Region
          </span>
        </div>
      </div>

      <h3 className={`text-xl font-bold tracking-tight mb-1 ${dark ? 'text-white' : 'text-foreground'}`}>{b.name}</h3>

      <div className="flex items-start gap-3 mb-4">
        <MapPin size={16} className="text-[#F59E0B] shrink-0 mt-1" />
        <div className={`text-base leading-relaxed ${dark ? 'text-white/80' : 'text-foreground/85'}`}>
          {b.address.map((line) => <p key={line}>{line}</p>)}
        </div>
      </div>

      <div className={`border-t pt-4 mt-auto space-y-2 ${dark ? 'border-white/10' : 'border-border'}`}>
        {b.phone.map((p) => (
          <a
            key={p}
            href={`tel:${p}`}
            className={`flex items-center gap-3 text-base transition-colors ${dark ? 'text-white/80 hover:text-[#F59E0B]' : 'text-foreground/85 hover:text-[#F59E0B]'}`}
          >
            <Phone size={15} className="text-[#F59E0B] shrink-0" />
            {p}
          </a>
        ))}
        <div className={`flex items-center gap-3 text-base ${dark ? 'text-white/80' : 'text-foreground/85'}`}>
          <Clock size={15} className="text-[#F59E0B] shrink-0" />
          {b.hours}
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <a
          href={`tel:${b.phone[0]}`}
          className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
            dark
              ? 'bg-[#F59E0B] text-white hover:bg-[#D97706]'
              : 'bg-[#F59E0B] text-white hover:bg-[#D97706]'
          }`}
        >
          <PhoneCall size={14} /> Call Branch
        </a>
        <a
          href="https://maps.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${
            dark
              ? 'border-white/20 text-white hover:bg-white/10'
              : 'border-border text-foreground/80 hover:bg-surface'
          }`}
        >
          <Navigation size={14} /> Directions
        </a>
      </div>
    </motion.div>
  );
}

export default function BranchesPage(): ReactNode {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden min-h-[520px] md:min-h-[600px] flex items-center bg-[#1a1a2e]">
        <div className="absolute inset-0">
          <img
            src="/images/branchesbg.png"
            alt=""
            className="w-full h-full object-cover"
          />
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
              Our Branches
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.08] text-white">
              Find us in <span className="text-[#F59E0B]">8 locations</span>
              <br />
              across Sri Lanka.
            </h1>
            <p className="mt-5 text-lg text-white/80 max-w-xl leading-relaxed">
              Walk in, call, or book online. Our team is ready to help with all your shipping needs - from parcel drop-offs to customs support.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <a href="#branches" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#F59E0B] text-white text-base font-semibold hover:bg-[#D97706] transition-colors cursor-pointer">
                View Locations
              </a>
              <a href="/contact" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/30 text-white text-base font-semibold hover:bg-white/10 transition-colors cursor-pointer">
                Contact Support
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Branches */}
      <section id="branches" className="relative bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <div className="max-w-2xl mb-12">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-4">
              <span className="w-6 h-px bg-[#F59E0B]" />
              Locations
            </span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-[1.15]">
              Our branches <span className="text-[#F59E0B]">in Sri Lanka.</span>
            </h2>
            <p className="text-lg text-foreground/85 mt-2 max-w-xl">
              From Colombo to Jaffna, every branch is equipped to handle all your international courier needs.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {branches.map((b, i) => (
              <BranchCard key={b.name} b={b} i={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="relative bg-gradient-to-b from-white to-[#fdf8f0]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <div className="max-w-2xl mb-12">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-4">
              <span className="w-6 h-px bg-[#F59E0B]" />
              Branch Services
            </span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-[1.15]">
              What you can do <span className="text-[#F59E0B]">at our branches.</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {services.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="rounded-2xl bg-white border border-border p-6 text-center shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
              >
                <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center mx-auto mb-4">
                  <s.icon className="size-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1.5">{s.title}</h3>
                <p className="text-lg text-foreground/90 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-start">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-4">
                <span className="w-6 h-px bg-[#F59E0B]" />
                FAQ
              </span>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
                Frequently Asked <span className="text-[#F59E0B]">Questions</span>
              </h2>
              <p className="text-lg text-foreground/90 leading-relaxed mb-6">
                About our branch locations and services
              </p>
              <p className="text-lg text-foreground/80 leading-relaxed mb-10">
                Can&apos;t find what you&apos;re looking for? Reach out to our support team 24/7.
              </p>

              <div className="relative overflow-hidden rounded-2xl border-t border-border pt-8">
                <div className="absolute inset-0 -mx-8 md:-mx-16 lg:-mx-24 -mb-16 md:-mb-20">
                  <img src="/images/cta.png" alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-[#1a1a2e]/80" />
                </div>
                <div className="relative z-10 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 md:p-8">
                  <h3 className="text-2xl font-bold tracking-tight text-white mb-2">
                    Still have questions?
                  </h3>
                  <p className="text-lg text-white/90 mb-6">
                    Get in touch with us for specialized support.
                  </p>
                  <a href="/contact" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#F59E0B] text-white text-base font-semibold hover:bg-[#D97706] transition-colors cursor-pointer w-fit">
                    Contact Support <ArrowUpRight size={14} />
                  </a>
                </div>
              </div>
            </div>

            <div className="space-y-0 border-t border-border">
              {branchFaqs.map((f, i) => (
                <div key={f.q} className="border-b border-border">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between py-4 text-left cursor-pointer"
                  >
                    <span className="text-lg font-medium text-foreground pr-4">{f.q}</span>
                    <ChevronDown
                      size={14}
                      className={`text-foreground/70 shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <div className={`overflow-hidden transition-all duration-200 ${openFaq === i ? 'max-h-40 pb-4' : 'max-h-0'}`}>
                    <p className="text-lg text-foreground/90 leading-relaxed">{f.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}