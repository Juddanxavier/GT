'use client';

import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, MessageCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { FaqAccordion } from '@/components/faq-accordion';
import { useTenantConfig } from '@/lib/use-tenant-config';
import { SectionIntro } from '@/components/sections/section-intro';

const faqData = [
  {
    q: 'What countries do you ship to?',
    a: 'We deliver to over 220 destinations worldwide. Coverage and transit times depend on the origin and destination country.',
  },
  {
    q: 'How do I track my shipment?',
    a: 'Enter your tracking number on the home page or in the Track section. You will see live status updates and tracking history.',
  },
  {
    q: 'Do you provide packing materials?',
    a: 'Yes, we offer packing guidance and can supply materials for eligible pickups. Fragile items are handled with extra care.',
  },
  {
    q: 'Can I schedule a door-to-door pickup?',
    a: 'Yes. Use the Schedule Pickup tab or the Pickup page to choose a convenient time and location.',
  },
  {
    q: 'How do I get a shipping quote?',
    a: 'Tell us what you want to ship — we will send a competitive rate estimate within 24 hours.',
  },
];

export function CTAFAQFooterSection(): ReactNode {
  const config = useTenantConfig();
  const [openFaqs, setOpenFaqs] = useState<Record<string, boolean>>({
    [faqData[0]?.q ?? '']: true,
  });

  function toggle(key: string) {
    setOpenFaqs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <section id="contact" className="premium-section bg-brand-cream">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 md:px-12 lg:px-16">
        <SectionIntro
          eyebrow="FAQ"
          title="Common questions"
          subtitle="Quick answers before you ship — tracking, pickup, quotes, and coverage."
          align="center"
          className="mb-12 md:mb-16"
        />

        <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="premium-card relative overflow-hidden bg-gradient-to-br from-brand-navy to-[#152a45] p-8 md:p-10 lg:col-span-5"
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-accent/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-12 h-48 w-48 rounded-full bg-brand-accent/10 blur-3xl" />
            <div className="relative">
              <p className="section-eyebrow !text-brand-accent/90">
                <span className="section-eyebrow-line !bg-brand-accent" />
                Get started
              </p>
              <h2 className="mt-4 text-2xl font-semibold leading-snug text-white md:text-3xl">
                {config.cta.headline}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/65 md:text-base">
                {config.cta.subtitle}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a
                  href="/register"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-medium text-brand-navy transition-colors hover:bg-white/90"
                >
                  {config.cta.button} <ArrowRight size={14} />
                </a>
                <a
                  href="/contact"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/20 px-7 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  <MessageCircle size={14} /> Talk to us
                </a>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="lg:col-span-7"
          >
            <div className="premium-card overflow-hidden ring-1 ring-brand-navy/5">
              <div className="border-b border-border/70 bg-surface px-5 py-4 md:px-6">
                <p className="text-sm font-medium text-foreground">Top questions from shippers</p>
                <p className="text-xs text-muted">Tap a question to expand the answer</p>
              </div>
              <FaqAccordion
                items={faqData}
                openKeys={openFaqs}
                onToggle={toggle}
                variant="list"
              />
            </div>
            <div className="mt-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <p className="text-sm text-muted">
                Need more detail on rates, customs, or prohibited items?
              </p>
              <a
                href="/faq"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-accent transition-colors hover:text-brand-accent-hover"
              >
                View all FAQs <ArrowUpRight size={14} />
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
