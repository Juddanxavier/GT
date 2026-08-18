'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { ChevronDown, ArrowUpRight } from 'lucide-react';

const faqData = [
  { q: 'What countries do you ship to?', a: 'We deliver to over 200 destinations worldwide. Coverage and transit times depend on the origin and destination country.' },
  { q: 'How do I track my shipment?', a: 'Enter your tracking number on the home page or in the Track section. You will see live status updates and tracking history.' },
  { q: 'Do you provide packing materials?', a: 'Yes, we offer packing guidance and can supply materials for eligible pickups. Fragile items are handled with extra care.' },
  { q: 'Can I schedule a door-to-door pickup?', a: 'Yes. Use the Schedule Pickup tab or the Pickup page to choose a convenient time and location.' },
  { q: 'How do I get a shipping quote?', a: 'Fill in origin, destination, and weight details in the Get a Quote tab and submit the form. Our team will respond within 24 hours.' },
];

export function FaqSection(): ReactNode {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <section className="relative bg-white">
      <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-16 md:py-20">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-start">
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-4">
              <span className="w-6 h-px bg-[#F59E0B]" />
              FAQ
            </span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
              Frequently Asked <span className="text-[#F59E0B]">Questions</span>
            </h2>
            <p className="text-lg text-foreground/90 leading-relaxed mb-6">
              Common questions about our services.
            </p>
            <p className="text-lg text-foreground/80 leading-relaxed mb-10">
              Can&apos;t find your answer? Contact our support team.
            </p>
            <div className="border-t border-border pt-8">
              <h3 className="text-2xl font-bold tracking-tight text-foreground mb-2">Still need help?</h3>
              <p className="text-lg text-foreground/90 mb-6">Get in touch for personalised support.</p>
              <a href="/contact" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#F59E0B] text-white text-base font-semibold hover:bg-[#D97706] transition-colors cursor-pointer w-fit">
                Contact Support <ArrowUpRight size={16} />
              </a>
            </div>
          </div>
          <div className="space-y-0 border-t border-border">
            {faqData.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={faq.q} className="border-b border-border">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between py-4 text-left cursor-pointer"
                  >
                    <span className="text-lg font-medium text-foreground pr-4">{faq.q}</span>
                    <ChevronDown
                      size={16}
                      className={`text-foreground/70 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <div className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-40 pb-4' : 'max-h-0'}`}>
                    <p className="text-lg text-foreground/90 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

