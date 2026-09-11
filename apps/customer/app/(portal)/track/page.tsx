'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, Bell, Clock, MapPin, PackageSearch, ShieldCheck, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { FaqAccordion } from '@/components/faq-accordion';
import { PageHero } from '@/components/page/page-hero';
import { PageSection, PageShell } from '@/components/page/page-section';
import { SectionIntro } from '@/components/sections/section-intro';
import { ShipSmarterCta } from '@/components/sections/ship-smarter-cta';
import { TrackSidebar } from '@/components/track/track-sidebar';
import { useTenantConfig } from '@/lib/use-tenant-config';

const trustBadges = [
  { icon: ShieldCheck, label: 'Secure & up to date', bg: 'bg-emerald-100 text-emerald-700', iconCls: 'text-emerald-500' },
  { icon: Clock, label: 'Live status updates', bg: 'bg-sky-100 text-sky-700', iconCls: 'text-sky-500' },
  { icon: MapPin, label: '220+ destinations', bg: 'bg-violet-100 text-violet-700', iconCls: 'text-violet-500' },
  { icon: Bell, label: 'WhatsApp alerts', bg: 'bg-amber-100 text-amber-700', iconCls: 'text-amber-500' },
] as const;

const steps = [
  {
    step: '01',
    icon: PackageSearch,
    title: 'Drop off or schedule pickup',
    desc: 'Visit a branch or book doorstep collection and receive your tracking number instantly.',
  },
  {
    step: '02',
    icon: Truck,
    title: 'Scanned at every checkpoint',
    desc: 'Your parcel is tracked from origin through customs and transit hubs.',
  },
  {
    step: '03',
    icon: MapPin,
    title: 'Last-mile delivery',
    desc: 'Local carriers take over with live status updates until arrival.',
  },
  {
    step: '04',
    icon: Bell,
    title: 'Delivered & confirmed',
    desc: 'Get delivery confirmation with a full journey timeline you can revisit anytime.',
  },
] as const;

const faqItems = [
  {
    q: 'How do I track my shipment?',
    a: 'Enter your tracking number in the sidebar search. You will see real-time status, estimated delivery, and a complete event timeline.',
  },
  {
    q: 'Where do I find my tracking number?',
    a: 'It is provided when your shipment is created — check your email, SMS, WhatsApp message, or branch receipt.',
  },
  {
    q: 'What do the statuses mean?',
    a: 'Booked — awaiting pickup. In transit — moving between hubs. Out for delivery — with the local carrier. Delivered — signed for.',
  },
  {
    q: "My tracking hasn't updated in days. Why?",
    a: 'Updates may pause during customs clearance, holidays, or remote transit. Contact support if it has been over 7 days.',
  },
  {
    q: 'Can I get notifications on status changes?',
    a: 'Yes. Create an account and claim your shipment to receive email and WhatsApp alerts on every update.',
  },
] as const;

export default function TrackPage(): ReactNode {
  const router = useRouter();
  const config = useTenantConfig();
  const [trackingNo, setTrackingNo] = useState('');
  const [openFaqs, setOpenFaqs] = useState<Record<string, boolean>>({
    'How do I track my shipment?': true,
  });

  function handleSearch(value: string) {
    router.push(`/track/${encodeURIComponent(value)}`);
  }

  function toggleFaq(key: string) {
    setOpenFaqs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <PageShell>
      <PageHero
        image="/images/trackbg.webp"
        eyebrow="Live tracking"
        title={
          <>
            Track your parcel
            <br />
            <span className="text-brand-accent">in real time.</span>
          </>
        }
        subtitle="Enter your tracking number for live status, delivery estimates, and a full journey timeline — no account required."
      />

      <PageSection>
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10 xl:gap-12">
          <div className="order-2 lg:order-1 lg:col-span-4">
            <TrackSidebar
              searchValue={trackingNo}
              onSearchChange={setTrackingNo}
              onSearchSubmit={handleSearch}
              searchPlaceholder="e.g. GT123456789"
            />
          </div>

          <div className="order-1 lg:order-2 lg:col-span-8 space-y-8">
            <div>
              <span className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent">
                <span className="h-px w-6 bg-brand-accent" />
                Live tracking
              </span>
              <h2 className="mb-2 text-3xl font-bold leading-[1.15] tracking-tight text-foreground md:text-4xl">
                Follow your parcel <span className="text-brand-accent">every step</span>
              </h2>
              <p className="mb-8 text-lg leading-relaxed text-foreground/90">
                Enter your tracking number in the sidebar to see instant status, estimated delivery,
                and a complete event history — no account required.
              </p>
              <div className="flex flex-wrap gap-3">
                {trustBadges.map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${item.bg}`}
                  >
                    <item.icon size={14} className={item.iconCls} />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection cream>
        <SectionIntro
          align="center"
          eyebrow="How it works"
          title="From drop-off to doorstep"
          subtitle="Every scan, every checkpoint — one timeline you can revisit anytime."
          className="mb-12"
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="premium-card premium-card-hover relative p-6"
            >
              <span className="absolute right-4 top-4 text-3xl font-black text-brand-accent/10">{s.step}</span>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-accent/10 text-brand-accent">
                <s.icon className="size-5" />
              </div>
              <h3 className="mb-1 text-base font-semibold text-foreground">{s.title}</h3>
              <p className="text-sm leading-relaxed text-foreground/60">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </PageSection>

      <PageSection>
        <div className="grid items-start gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <SectionIntro
              eyebrow="FAQ"
              title="Tracking questions"
              subtitle={`Everything you need to know about tracking with ${config.name}.`}
            />
            <div className="mt-10 border-t border-border pt-8">
              <h3 className="text-xl font-semibold tracking-tight text-foreground">Still need help?</h3>
              <p className="mt-2 text-base leading-relaxed text-muted">
                Our team is available Mon–Sat, 9 AM – 9 PM for tracking queries and delivery support.
              </p>
              <a href="/contact" className="premium-btn mt-6 inline-flex items-center gap-2">
                Contact Support <ArrowUpRight size={16} />
              </a>
              <a
                href={config.contact.phoneHref}
                className="mt-3 block text-sm font-semibold text-brand-accent hover:text-brand-accent-hover"
              >
                {config.contact.phone} →
              </a>
            </div>
          </div>
          <FaqAccordion items={faqItems} openKeys={openFaqs} onToggle={toggleFaq} />
        </div>
      </PageSection>

      <PageSection cream>
        <ShipSmarterCta />
      </PageSection>
    </PageShell>
  );
}
