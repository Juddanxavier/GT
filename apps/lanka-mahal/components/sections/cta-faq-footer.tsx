'use client';

import { ArrowRight, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTenantConfig } from '@/lib/use-tenant-config';

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
    a: 'Tell us what you want to ship — we will send a competitive rate estimate within 24 hours.',
  },
];

export function CTAFAQFooterSection(): ReactNode {
  const config = useTenantConfig();
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  return (
    <section id="contact" className="relative bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-20">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-stretch">
          {/* CTA */}
          <div className="relative rounded-sm overflow-hidden p-8 sm:p-10 md:p-12 text-center flex flex-col items-center justify-center h-full">
            <div className="absolute inset-0 cta-gradient-bg" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#F59E0B]/20 to-transparent" />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold text-white leading-[1.15] tracking-tight mb-3">
                {config.cta.headline}
              </h2>
              <p className="text-base text-white/80 mb-8 max-w-sm">{config.cta.subtitle}</p>
              <a
                href="/register"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto h-11 px-8 rounded-sm bg-white text-[#F59E0B] text-sm font-semibold hover:bg-white/90 transition-all cursor-pointer"
              >
                {config.cta.button} <ArrowRight size={14} />
              </a>
            </div>
          </div>

          {/* FAQ */}
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-4">
              <span className="w-6 h-px bg-[#F59E0B]" />
              FAQ
            </span>
            <h3 className="text-xl font-bold text-foreground mb-6">Common questions</h3>

            <div className="space-y-0 border-t border-border">
              {faqData.map((faq, i) => (
                <div key={i} className="border-b border-border">
                  <button
                    type="button"
                    onClick={() => setActiveIndex(activeIndex === i ? null : i)}
                    className="w-full flex items-center justify-between py-4 text-left cursor-pointer"
                  >
                    <span className="text-base font-medium text-foreground pr-4">{faq.q}</span>
                    <ChevronDown
                      size={14}
                      className={`text-foreground/40 shrink-0 transition-transform duration-200 ${activeIndex === i ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-200 ${activeIndex === i ? 'max-h-40 pb-4' : 'max-h-0'}`}
                  >
                    <p className="text-base text-foreground/90 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .cta-gradient-bg {
          background: linear-gradient(135deg, #F59E0B, #D97706, #F59E0B, #FF6B4A, #F59E0B);
          background-size: 300% 300%;
          animation: gradientShift 6s ease infinite;
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </section>
  );
}
