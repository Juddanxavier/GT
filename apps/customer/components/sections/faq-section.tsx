'use client';

import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { FaqAccordion } from '@/components/faq-accordion';
import { PageSection } from '@/components/page/page-section';
import { SectionIntro } from '@/components/sections/section-intro';

const faqData = [
  {
    q: 'What countries do you ship to?',
    a: 'We deliver to over 200 destinations worldwide. Coverage and transit times depend on the origin and destination country.',
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
    a: 'Fill in origin, destination, and weight details on the Check Price page and submit the form. Our team will respond within 24 hours.',
  },
];

export function FaqSection(): ReactNode {
  const [openFaqs, setOpenFaqs] = useState<Record<string, boolean>>({ 'What countries do you ship to?': true });

  function toggle(key: string) {
    setOpenFaqs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <PageSection cream>
      <div className="grid items-start gap-12 md:grid-cols-2 md:gap-16">
        <div>
          <SectionIntro
            eyebrow="FAQ"
            title="Frequently asked questions"
            subtitle="Common questions about our services. Can't find your answer? Our team is here to help."
          />
          <div className="mt-10 border-t border-border pt-8">
            <h3 className="text-xl font-semibold tracking-tight text-foreground">Still need help?</h3>
            <p className="mt-2 text-base leading-relaxed text-muted">
              Get in touch for personalised support on quotes, tracking, or customs.
            </p>
            <a href="/contact" className="premium-btn mt-6 inline-flex items-center gap-2">
              Contact Support <ArrowUpRight size={16} />
            </a>
            <a
              href="/faq"
              className="mt-3 block text-sm font-semibold text-brand-accent hover:text-brand-accent-hover"
            >
              View all FAQs →
            </a>
          </div>
        </div>
        <FaqAccordion items={faqData} openKeys={openFaqs} onToggle={toggle} />
      </div>
    </PageSection>
  );
}
