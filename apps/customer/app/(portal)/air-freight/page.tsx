'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Globe,
  Headphones,
  PackageSearch,
  Rocket,
  Shield,
  Truck,
  Wallet,
  Zap,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { FaqSection } from '@/components/sections/faq-section';
import { PageHero } from '@/components/page/page-hero';
import { PageSection, PageShell } from '@/components/page/page-section';

const plans = [
  {
    icon: Zap,
    tag: '3–5 days',
    title: 'GT Express Priority',
    desc: 'Our fastest express service for time-sensitive shipments. Direct flight operations from major airports deliver your parcel worldwide with the shortest possible transit time.',
    bestFor: 'Urgent documents, gifts, time-sensitive shipments',
    benefit: 'Direct air routing — fastest international delivery',
    accent: '#E8621A',
  },
  {
    icon: Rocket,
    tag: '3–7 days',
    title: 'GT Express Saver',
    desc: 'A reliable express option for everyday shipments — consistent worldwide delivery without the premium price tag of urgent services.',
    bestFor: 'NRI care packages, regular personal parcels',
    benefit: 'Reliable delivery at affordable rates',
    accent: '#3B82F6',
  },
  {
    icon: Globe,
    tag: '4–7 days',
    title: 'GT Express Edge',
    desc: 'A region-focused express service for shipments to the Middle East, Africa, Europe, and Asia — with lane-optimised routing for better cost and reliable delivery.',
    bestFor: 'Shipments to EMEA and Asian corridors',
    benefit: 'Region-specific routing, better rates',
    accent: '#8B5CF6',
  },
  {
    icon: Wallet,
    tag: '8–12 days',
    title: 'GT Express Economy',
    desc: 'Low-cost express delivery for everyday parcels, student shipments, and personal packages — fast shipping at the most affordable rates.',
    bestFor: 'Students, first-time shippers, bulk parcels',
    benefit: 'Lowest international courier charges',
    accent: '#10B981',
  },
  {
    icon: Truck,
    tag: '10–15 days',
    title: 'GT Express Standard',
    desc: 'Budget-friendly shipping for non-urgent parcels. Reliable delivery with full tracking at the most economical rates.',
    bestFor: 'Non-urgent parcels, bulk shipments, cost-conscious shippers',
    benefit: 'Most affordable option with full tracking',
    accent: '#F59E0B',
  },
];

const strengths = [
  {
    icon: Plane,
    title: 'Daily air uplift operations',
    desc: 'Your parcel moves every day — no waiting, no backlogs. Daily flights mean faster shipping.',
  },
  {
    icon: Globe,
    title: '220+ global destinations',
    desc: 'Fast international shipping to major destinations worldwide with smooth, reliable express coverage.',
  },
  {
    icon: PackageSearch,
    title: 'Real-time tracking',
    desc: 'Track your express delivery live — from pickup to doorstep with updates at every stage.',
  },
  {
    icon: Truck,
    title: 'Doorstep pickup',
    desc: 'Within 5 km of our offices — conditions apply. Outside the zone? Drop off at your nearest branch.',
  },
  {
    icon: Headphones,
    title: '24/7 customer support',
    desc: 'Get help whenever you need it. Our support team is available around the clock.',
  },
  {
    icon: Shield,
    title: 'Secure packing support',
    desc: 'Trained professionals carefully pack fragile, valuable, and important shipments.',
  },
];

function Plane(props: { size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      width={props.size ?? 24}
      height={props.size ?? 24}
    >
      <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8l-8.2-1.8L3 8l5.5 3.5L6 16l1.5 1.5L12 18l2.5 4.5 2-1.5L17.8 19.2z" />
    </svg>
  );
}

export default function AirFreightPage(): ReactNode {
  return (
    <PageShell>
      <PageHero
        image="/images/heroparcel.webp"
        eyebrow="Air Freight"
        title="Air Freight Services"
        subtitle="Fast air freight shipping to 200+ countries with daily uplift operations and delivery in 3–15 days."
      />

      <PageSection>
            <div className="space-y-14">
              <div>
                <p className="text-lg text-foreground/90 leading-relaxed mb-8">
                  Fast international shipping to <strong>200+ countries</strong>. With daily air
                  uplift operations, multiple pickup locations, and delivery to major destinations
                  in just <strong>3–5 days</strong>, shipping overseas has never been simpler or
                  more reliable.
                </p>

                <div className="flex flex-wrap gap-3">
                  {[
                    { icon: Truck, label: 'Pickup within 5 km of offices' },
                    { icon: Shield, label: 'Fully insured shipments' },
                    { icon: Globe, label: 'Customs handled end-to-end' },
                    { icon: Clock, label: '4.8★ rated on Google' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface/50 border border-border text-sm font-medium text-foreground/80"
                    >
                      <item.icon size={14} className="text-brand-accent" />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent mb-6">
                  <span className="w-6 h-px bg-brand-accent" />
                  Our Plans
                </span>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-2">
                  Choose the shipping speed{' '}
                  <span className="text-brand-accent">that fits your needs</span>
                </h2>
                <p className="text-lg text-foreground/85 mb-8">
                  From urgent international shipments to budget-friendly parcel delivery, every plan
                  includes real-time tracking, secure handling, doorstep pickup, and 24/7 support.
                </p>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {plans.map((plan, i) => (
                    <motion.div
                      key={plan.title}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08, duration: 0.4 }}
                      className="premium-card premium-card-hover p-6 flex flex-col"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                        style={{ backgroundColor: `${plan.accent}15`, color: plan.accent }}
                      >
                        <plan.icon size={20} />
                      </div>
                      <span
                        className="text-xs font-bold uppercase tracking-wider text-white px-2.5 py-1 rounded-full w-fit mb-3"
                        style={{ backgroundColor: plan.accent }}
                      >
                        {plan.tag}
                      </span>
                      <h3 className="text-base font-bold text-foreground mb-1.5">{plan.title}</h3>
                      <p className="text-sm text-foreground/75 leading-relaxed mb-4 flex-1">{plan.desc}</p>
                      <div className="space-y-1.5 mb-4">
                        <div className="flex items-start gap-1.5 text-xs text-foreground/70">
                          <CheckCircle size={12} className="shrink-0 mt-0.5" style={{ color: plan.accent }} />
                          <span>
                            <strong>Best for:</strong> {plan.bestFor}
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5 text-xs text-foreground/70">
                          <CheckCircle size={12} className="shrink-0 mt-0.5" style={{ color: plan.accent }} />
                          <span>
                            <strong>Benefit:</strong> {plan.benefit}
                          </span>
                        </div>
                      </div>
                      <a
                        href="/check-price"
                        className="mt-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-xs font-bold transition-colors w-fit hover:opacity-90"
                        style={{ backgroundColor: plan.accent }}
                      >
                        Check Price <ArrowRight size={12} />
                      </a>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="bg-surface/50 rounded-3xl p-8 md:p-10 border border-border">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent mb-6">
                  <span className="w-6 h-px bg-brand-accent" />
                  Why Gajan Traders
                </span>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-8">
                  Why thousands choose us for{' '}
                  <span className="text-brand-accent">express delivery</span>
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {strengths.map((s, i) => (
                    <motion.div
                      key={s.title}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                      className="rounded-2xl bg-white border border-border p-5"
                    >
                      <div className="w-10 h-10 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center mb-3">
                        <s.icon size={20} />
                      </div>
                      <h3 className="text-base font-bold text-foreground mb-1.5">{s.title}</h3>
                      <p className=" text-foreground/85 leading-relaxed">{s.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl p-8 md:p-12 text-center">
                <div className="absolute inset-0 bg-brand-navy" />
                <div className="cta-orb cta-orb-1" />
                <div className="cta-orb cta-orb-2" />
                <div className="cta-orb cta-orb-3" />
                <div className="relative z-10">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.08] text-white mb-3">
                    Ship Faster.{' '}
                    <span className="text-brand-accent">Ship Smarter.</span>
                  </h2>
                  <p className="text-base text-white/75 max-w-lg mx-auto mb-8">
                    Get an instant quote, find a branch, or schedule a pickup — whatever works for
                    you.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <a
                      href="/check-price"
                      className="px-6 py-3 rounded-xl bg-white text-brand-accent text-base font-semibold hover:bg-white/90 transition-colors inline-flex items-center gap-2"
                    >
                      Check Price <ArrowRight size={16} />
                    </a>
                    <a
                      href="/pickup"
                      className="px-6 py-3 rounded-xl border border-white/20 text-white text-base font-semibold hover:bg-white/10 transition-colors inline-flex items-center gap-2"
                    >
                      Schedule Pickup
                    </a>
                    <a
                      href="/branches"
                      className="px-6 py-3 rounded-xl border border-white/20 text-white text-base font-semibold hover:bg-white/10 transition-colors inline-flex items-center gap-2"
                    >
                      Find a Branch
                    </a>
                  </div>
                </div>
              </div>

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
      </PageSection>

      <FaqSection />
    </PageShell>
  );
}
