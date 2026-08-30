'use client';

import { ArrowRight, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTenantConfig } from '@/lib/use-tenant-config';

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
  const [activeIndex, setActiveIndex] = useState<string | null>(faqData[0]?.q ?? null);

  return (
    <section id="contact" className="relative bg-white">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 md:px-16 md:py-20 lg:px-24">
        <div className="grid items-stretch gap-8 md:grid-cols-2 md:gap-12">
          <div className="relative overflow-hidden rounded-2xl p-8 text-center flex flex-col items-center justify-center h-full sm:p-10 md:p-12">
            <div className="absolute inset-0 bg-[#1a1a2e]" />
            <div className="cta-orb cta-orb-1" />
            <div className="cta-orb cta-orb-2" />
            <div className="cta-orb cta-orb-3" />
            <div className="relative z-10">
              <h2 className="mb-3 text-2xl font-bold leading-[1.15] tracking-tight text-white md:text-3xl">
                {config.cta.headline}
              </h2>
              <p className="mb-8 max-w-sm text-base text-white/80">{config.cta.subtitle}</p>
              <a
                href="/register"
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-8 text-sm font-semibold text-[#E8621A] transition-all hover:bg-white/90 sm:w-auto"
              >
                {config.cta.button} <ArrowRight size={14} />
              </a>
            </div>
          </div>

          <div>
            <span className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#E8621A]">
              <span className="h-px w-6 bg-[#E8621A]" />
              FAQ
            </span>
            <h3 className="mb-6 text-xl font-bold text-foreground">Common questions</h3>

            <div className="space-y-0 border-t border-border">
              {faqData.map((faq) => (
                <div key={faq.q} className="border-b border-border">
                  <button
                    type="button"
                    onClick={() => setActiveIndex(activeIndex === faq.q ? null : faq.q)}
                    className="flex w-full cursor-pointer items-center justify-between py-4 text-left"
                  >
                    <span className="pr-4 text-base font-medium text-foreground">{faq.q}</span>
                    <ChevronDown
                      size={14}
                      className={`shrink-0 text-foreground/40 transition-transform duration-200 ${activeIndex === faq.q ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-200 ${activeIndex === faq.q ? 'max-h-40 pb-4' : 'max-h-0'}`}
                  >
                    <p className="text-base leading-relaxed text-foreground/90">{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
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
    </section>
  );
}
