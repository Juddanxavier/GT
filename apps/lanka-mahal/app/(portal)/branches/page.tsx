'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Building2, Clock, Users, Package, Globe, ArrowUpRight, ChevronDown } from 'lucide-react';

const branches = [
  {
    name: 'Lanka Mahal — Head Office (Modara)',
    address: ['40B, St Jems Street, Modara,', 'Colombo 15,', 'Sri Lanka.'],
    phone: ['074 030 0976', '077 839 3974', '011 252 5398'],
    hours: 'Monâ€“Sat, 9 AM â€“ 6 PM',
    image: 'https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800&q=80',
  },
  {
    name: 'Lanka Mahal — Jaffna',
    address: ['40, Kannathiddy Road,', 'Jaffna,', 'Sri Lanka.'],
    phone: ['077 839 3974', '077 158 0268', '021 221 0153'],
    hours: 'Monâ€“Sat, 9 AM â€“ 6 PM',
    image: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=800&q=80',
  },
  {
    name: 'Lanka Mahal — Kilinochchi',
    address: ['56/B, A9 Road, Ananthapuram,', 'Kilinochchi,', 'Sri Lanka.'],
    phone: ['074 194 3697', '077 839 3974', '021 228 2848'],
    hours: 'Monâ€“Sat, 9 AM â€“ 6 PM',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80',
  },
  {
    name: 'Lanka Mahal — Vavuniya',
    address: ['65, 2nd Cross Street,', 'Vavuniya,', 'Sri Lanka.'],
    phone: ['074 074 7804', '077 839 3974', '024 222 6566'],
    hours: 'Monâ€“Sat, 9 AM â€“ 6 PM',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80',
  },
  {
    name: 'Lanka Mahal — Trincomalee',
    address: ['361B, Power House Road,', 'Trincomalee,', 'Sri Lanka.'],
    phone: ['074 194 3678', '077 839 3974', '026 222 8285'],
    hours: 'Monâ€“Sat, 9 AM â€“ 6 PM',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80',
  },
  {
    name: 'Lanka Mahal — Mullaitivu',
    address: ['Paranthan Road, Putukudiyiruppu,', 'Mullaitivu,', 'Sri Lanka.'],
    phone: ['074 194 3699', '077 839 3974', '021 229 0410'],
    hours: 'Monâ€“Sat, 9 AM â€“ 6 PM',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
  },
  {
    name: 'Lanka Mahal — Mannar',
    address: ["St. Sebastian's Street, Hospital Road,", 'Mannar,', 'Sri Lanka.'],
    phone: ['074 074 7661', '077 839 3974', '023 222 3687'],
    hours: 'Monâ€“Sat, 9 AM â€“ 6 PM',
    image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80',
  },
  {
    name: 'Lanka Mahal — Batticaloa',
    address: ['569, Trinco Road,', 'Batticaloa,', 'Sri Lanka.'],
    phone: ['074 194 3698', '077 839 3974', '065 222 7995'],
    hours: 'Monâ€“Sat, 9 AM â€“ 6 PM',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80',
  },
];

const services = [
  { icon: Package, title: 'Parcel Booking', desc: 'Ship documents and parcels to 220+ countries from any branch.' },
  { icon: Globe, title: 'Customs Support', desc: 'In-house documentation and customs clearance assistance.' },
  { icon: Clock, title: 'Real-time Tracking', desc: 'Live tracking updates from drop-off to delivery.' },
  { icon: Users, title: 'Walk-in Support', desc: 'Friendly staff to help with quotes, forms, and queries.' },
];

const branchFaqs = [
  { q: 'What are your branch timings?', a: 'All our branches are open Monâ€“Sat, 9 AM to 6 PM. All locations are closed on Sundays and public holidays.' },
  { q: 'Can I drop off a prepaid shipment at any branch?', a: 'Yes. You can drop off prepaid shipments at any of our branches. Make sure your airway bill is attached and the package is properly sealed.' },
  { q: 'Do I need an appointment to visit?', a: 'No appointment is needed. Walk-ins are welcome during working hours. For bulky shipments or specialized queries, calling ahead is recommended.' },
  { q: 'Can I collect my shipment from a branch?', a: 'Yes. If you miss a delivery or prefer self-collection, your shipment can be redirected to your nearest branch. Contact our support team to arrange this.' },
  { q: 'What payment methods do you accept?', a: 'We accept cash, bank transfers, and card payments at all branch locations.' },
];

export default function BranchesPage(): ReactNode {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="w-screen left-[calc(-50vw+50%)] relative overflow-hidden min-h-[450px] md:min-h-[600px] flex items-center bg-[#1a1a2e]">
        <div className="absolute inset-0">
          <img
            src="/images/branchesbg.png"
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
            <span className="inline-flex items-center gap-2 text-base font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-6">
              <span className="w-6 h-px bg-[#F59E0B]" />
              Our Branches
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-white max-w-2xl">
              Find us in
              <br />
              <span className="text-[#F59E0B]">8 locations across Sri Lanka.</span>
            </h1>
            <p className="mt-5 text-lg text-white/90 max-w-md leading-relaxed">
              8 locations across Sri Lanka to serve you better. Walk in, call, or book online. Our team is ready to help with all your shipping needs.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Intro */}
      <section className="w-screen left-[calc(-50vw+50%)] relative bg-white">
        <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-16 md:py-20 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="border border-border py-1 px-4 rounded-full text-base font-semibold tracking-wide uppercase text-foreground/85 bg-surface-secondary/50 inline-block mb-6">
              About Our Branches
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
              Serving Sri Lanka from <span className="text-[#F59E0B]">8 convenient locations.</span>
            </h2>
            <p className="text-lg text-foreground/90 leading-relaxed">
              From Colombo to Jaffna, our branches are equipped to handle all your international courier needs - from parcel drop-offs and tracking support to customs documentation and expert advice.
            </p>
          </div>
        </div>
      </section>

      {/* Branches */}
      <section className="w-screen left-[calc(-50vw+50%)] relative bg-surface">
        <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-16 md:py-20">
          <div className="flex flex-col items-center text-center max-w-lg mx-auto mb-12">
            <div className="border border-border py-1 px-4 rounded-full text-base font-semibold tracking-wide uppercase text-foreground/85 bg-surface-secondary/50">
              Locations
            </div>
            <h2 className="mt-6 text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Our branches <span className="text-[#F59E0B]">in Sri Lanka.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {branches.map((b, i) => (
              <motion.div
                key={b.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="rounded-2xl overflow-hidden border border-border bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
              >
                <div className="h-56 overflow-hidden">
                  <img src={b.image} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="p-7">
                  <div className="w-11 h-11 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center mb-4">
                    <Building2 className="size-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">{b.name}</h3>

                  <div className="flex items-start gap-3 mb-3">
                    <MapPin size={15} className="text-[#F59E0B] shrink-0 mt-0.5" />
                    <div className="text-lg text-foreground/90 leading-relaxed">
                      {b.address.map((line) => <p key={line}>{line}</p>)}
                    </div>
                  </div>

                  {b.phone.map((p) => (
                    <div key={p} className="flex items-center gap-3 mb-1.5">
                      <Phone size={15} className="text-[#F59E0B] shrink-0" />
                      <a href={`tel:${p}`} className="text-lg text-foreground/90 hover:text-[#F59E0B] transition-colors">{p}</a>
                    </div>
                  ))}

                  <div className="flex items-center gap-3 pt-3 border-t border-border">
                    <Clock size={15} className="text-[#F59E0B] shrink-0" />
                    <span className="text-lg text-foreground/90">{b.hours}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="w-screen left-[calc(-50vw+50%)] relative bg-white">
        <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-16 md:py-20">
          <div className="flex flex-col items-center text-center max-w-lg mx-auto mb-12">
            <div className="border border-border py-1 px-4 rounded-full text-base font-semibold tracking-wide uppercase text-foreground/85 bg-surface-secondary/50">
              Branch Services
            </div>
            <h2 className="mt-6 text-3xl md:text-4xl font-bold tracking-tight text-foreground">
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
                className="rounded-2xl bg-surface border border-border p-6 text-center"
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
      <section className="w-screen left-[calc(-50vw+50%)] relative bg-white">
        <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-16 md:py-20">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-start">
            <div>
              <span className="inline-flex items-center gap-2 text-base font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-4">
                <span className="w-6 h-px bg-[#F59E0B]" />
                FAQ
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
                Frequently Asked <span className="text-[#F59E0B]">Questions</span>
              </h2>
              <p className=" text-foreground/90 leading-relaxed mb-6">
                About our branch locations and services
              </p>
              <p className=" text-foreground/80 leading-relaxed mb-10">
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

