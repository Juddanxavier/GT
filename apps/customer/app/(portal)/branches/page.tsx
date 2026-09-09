'use client';

import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Building2,
  ChevronDown,
  Clock,
  Globe,
  MapPin,
  Package,
  Phone,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { PageHero } from '@/components/page/page-hero';
import { PageSection, PageShell } from '@/components/page/page-section';

const branches = [
  {
    name: 'Gajan Traders — Head Office',
    address: [
      '137/70 (First Floor), L.D.G Road,',
      'Little Mount, Saidapet,',
      'Chennai — 600 015, India.',
    ],
    phone: ['7200158309', '90033 67790'],
    landline: '044-22201719',
    hours: 'Mon–Sat, 9 AM – 9 PM',
  },
  {
    name: 'Annai Eximm — Branch Office',
    address: ['C/o No:104/246, Adam Sahib Street,', 'Royapuram,', 'Chennai — 600 013.'],
    phone: ['7708152719', '95008 11847'],
    hours: 'Mon–Sat, 9 AM – 8 PM',
  },
];

const services = [
  {
    icon: Package,
    title: 'Parcel Booking',
    desc: 'Ship documents and parcels to 220+ countries from any branch.',
  },
  {
    icon: Globe,
    title: 'Customs Support',
    desc: 'In-house documentation and customs clearance assistance.',
  },
  {
    icon: Clock,
    title: 'Real-time Tracking',
    desc: 'Live tracking updates from drop-off to delivery.',
  },
  {
    icon: Users,
    title: 'Walk-in Support',
    desc: 'Friendly staff to help with quotes, forms, and queries.',
  },
];

const branchFaqs = [
  {
    q: 'What are your branch timings?',
    a: 'Our Head Office is open Mon–Sat, 9 AM to 9 PM. The Annai Eximm branch is open Mon–Sat, 9 AM to 8 PM. Both locations are closed on Sundays and public holidays.',
  },
  {
    q: 'Can I drop off a prepaid shipment at any branch?',
    a: 'Yes. You can drop off prepaid shipments at any of our branches. Make sure your airway bill is attached and the package is properly sealed.',
  },
  {
    q: 'Do I need an appointment to visit?',
    a: 'No appointment is needed. Walk-ins are welcome during working hours. For bulky shipments or specialized queries, calling ahead is recommended.',
  },
  {
    q: 'Can I collect my shipment from a branch?',
    a: 'Yes. If you miss a delivery or prefer self-collection, your shipment can be redirected to your nearest branch. Contact our support team to arrange this.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept cash, UPI (Google Pay, PhonePe, Paytm), bank transfers, and card payments at all branch locations.',
  },
];

export default function BranchesPage(): ReactNode {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <PageShell>
      <PageHero
        image="/images/branchesbg.webp"
        eyebrow="Our Branches"
        title={
          <>
            Find us in
            <br />
            <span className="text-brand-accent">Chennai.</span>
          </>
        }
        subtitle="Two locations to serve you better. Walk in, call, or book online. Our team is ready to help with all your shipping needs."
      />

      {/* Intro */}
      <PageSection>
          <div className="max-w-2xl mx-auto text-center">
            <div className="border border-border py-1 px-4 rounded-full text-base font-semibold tracking-wide uppercase text-foreground/85 bg-surface-secondary/50 inline-block mb-6">
              About Our Branches
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
              Serving Chennai from two <span className="text-brand-accent">convenient locations.</span>
            </h2>
            <p className="text-lg text-foreground/90 leading-relaxed">
              Whether you&apos;re in Saidapet or Royapuram, our branches are equipped to handle all
              your international courier needs — from parcel drop-offs and tracking support to
              customs documentation and expert advice.
            </p>
          </div>
      </PageSection>

      {/* Branches */}
      <PageSection cream>
          <div className="flex flex-col items-center text-center max-w-lg mx-auto mb-12">
            <div className="border border-border py-1 px-4 rounded-full text-base font-semibold tracking-wide uppercase text-foreground/85 bg-surface-secondary/50">
              Locations
            </div>
            <h2 className="mt-6 text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Our branches <span className="text-brand-accent">in Chennai.</span>
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
                className="group rounded-2xl overflow-hidden bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-border/50 hover:shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-shadow"
              >
                <div className="relative bg-brand-navy px-7 py-5">
                  <div className="absolute inset-0 bg-[url('/images/heroparcel.webp')] bg-cover bg-center opacity-10" />
                  <div className="relative flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-accent text-white flex items-center justify-center shrink-0">
                      <Building2 className="size-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">{b.name}</h3>
                  </div>
                </div>

                <div className="p-7 space-y-5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-1">Address</p>
                      {b.address.map((line) => (
                        <p key={line} className="text-base text-foreground/90 leading-relaxed">{line}</p>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center shrink-0 mt-0.5">
                      <Phone size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-1">Phone</p>
                      {b.phone.map((p) => (
                        <a
                          key={p}
                          href={`tel:${p}`}
                          className="block text-base text-foreground/90 hover:text-brand-accent transition-colors"
                        >
                          {p}
                        </a>
                      ))}
                      {b.landline && (
                        <a
                          href={`tel:${b.landline}`}
                          className="block text-base text-foreground/90 hover:text-brand-accent transition-colors"
                        >
                          {b.landline}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center shrink-0 mt-0.5">
                      <Clock size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-1">Hours</p>
                      <p className="text-base text-foreground/90">{b.hours}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/50 flex flex-wrap gap-3">
                    <a
                      href={`tel:${b.phone[0]}`}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-accent-hover"
                    >
                      <Phone size={14} />
                      Call Now
                    </a>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address.join(' '))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/[0.03]"
                    >
                      <MapPin size={14} />
                      Get Directions
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
      </PageSection>

      {/* Services */}
      <PageSection>
          <div className="flex flex-col items-center text-center max-w-lg mx-auto mb-12">
            <div className="border border-border py-1 px-4 rounded-full text-base font-semibold tracking-wide uppercase text-foreground/85 bg-surface-secondary/50">
              Branch Services
            </div>
            <h2 className="mt-6 text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              What you can do <span className="text-brand-accent">at our branches.</span>
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
                className="premium-card premium-card-hover p-6 text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center mx-auto mb-4">
                  <s.icon className="size-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1.5">{s.title}</h3>
                <p className="text-lg text-foreground/90 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
      </PageSection>

      {/* FAQ */}
      <PageSection>
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-start">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent mb-6">
                <span className="w-6 h-px bg-brand-accent" />
                FAQ
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
                Frequently Asked <span className="text-brand-accent">Questions</span>
              </h2>
              <p className=" text-foreground/90 leading-relaxed mb-6">
                About our branch locations and services
              </p>
              <p className=" text-foreground/80 leading-relaxed mb-10">
                Can&apos;t find what you&apos;re looking for? Reach out to our support team 24/7.
              </p>

              <div className="relative overflow-hidden rounded-2xl border-t border-border pt-8">
                <div className="absolute inset-0 -mx-8 md:-mx-16 lg:-mx-24 -mb-16 md:-mb-20">
                  <Image
                    src="/images/cta.webp"
                    alt=""
                    fill
                    sizes="100vw"
                    className="object-cover"
                  />
          <div className="absolute inset-0 bg-brand-navy/70" />
                  
                </div>
                <div className="relative z-10 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-6 md:p-8">
                  <h3 className="text-2xl font-bold tracking-tight text-white mb-2">
                    Still have questions?
                  </h3>
                  <p className="text-lg text-white/90 mb-6">
                    Get in touch with us for specialized support.
                  </p>
                  <a
                    href="/contact"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-accent text-white text-base font-semibold hover:bg-brand-accent-hover transition-colors cursor-pointer w-fit"
                  >
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
                  <div
                    className={`overflow-hidden transition-all duration-200 ${openFaq === i ? 'max-h-40 pb-4' : 'max-h-0'}`}
                  >
                    <p className="text-lg text-foreground/90 leading-relaxed">{f.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
      </PageSection>
    </PageShell>
  );
}
