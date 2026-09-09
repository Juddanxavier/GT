'use client';

import { ArrowUpRight, Building2, Clock, Mail, Phone, Send } from 'lucide-react';
import type { ReactNode } from 'react';
import { PageHero } from '@/components/page/page-hero';
import { PageSection, PageShell } from '@/components/page/page-section';
import { FaqSection } from '@/components/sections/faq-section';
import { useTenantConfig } from '@/lib/use-tenant-config';

const WORKING_HOURS = 'Mon–Sat, 9 AM – 9 PM';

export default function ContactPage(): ReactNode {
  const config = useTenantConfig();
  const contactInfo = [
    { icon: Mail, title: 'Email', value: config.contact.email },
    { icon: Phone, title: 'Phone', value: config.contact.phone },
    { icon: Clock, title: 'Working Hours', value: WORKING_HOURS },
  ];

  return (
    <PageShell>
      <PageHero
        image="/images/contact.png"
        eyebrow="Contact Us"
        title={
          <>
            Get in touch
            <br />
            <span className="text-brand-accent">with our team.</span>
          </>
        }
        subtitle="Have a question, concern, or feedback? We're here to help — reach out anytime."
      />

      <PageSection>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="section-eyebrow mb-6">
              <span className="section-eyebrow-line bg-brand-accent" />
              Reach Us
            </span>
            <h2 className="mb-6 text-3xl font-bold leading-[1.15] tracking-tight text-foreground md:text-4xl">
              We&apos;d love <span className="text-brand-accent">to hear from you.</span>
            </h2>
            <p className="mb-10 text-lg leading-relaxed text-foreground/90">
              Whether you need a quote, have a tracking query, or just want to say hello — our team
              is ready to assist.
            </p>

            <div className="mb-10 grid gap-4 sm:grid-cols-2">
              {contactInfo.map((c) => (
                <div key={c.title} className="premium-card p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-accent/10 text-brand-accent">
                    <c.icon className="size-4" />
                  </div>
                  <p className="mb-0.5 font-semibold uppercase tracking-wider text-foreground/80">
                    {c.title}
                  </p>
                  <p className="text-lg font-medium text-foreground">{c.value}</p>
                </div>
              ))}
              <a
                href="/branches"
                className="premium-card premium-card-hover border-brand-accent/20 bg-brand-accent/5 p-5"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-accent/10 text-brand-accent">
                  <Building2 className="size-4" />
                </div>
                <p className="mb-0.5 font-semibold uppercase tracking-wider text-brand-accent">
                  Branches
                </p>
                <p className="text-lg font-medium text-foreground transition-colors group-hover:text-brand-accent">
                  Chennai — 2 locations <ArrowUpRight size={12} className="inline" />
                </p>
              </a>
            </div>
          </div>

          <div>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="premium-card space-y-5 p-8"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="mb-1.5 block font-semibold text-foreground/90">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="contact-name"
                    placeholder="Your name"
                    className="premium-input"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="mb-1.5 block font-semibold text-foreground/90">
                    Email
                  </label>
                  <input
                    type="email"
                    id="contact-email"
                    placeholder="you@example.com"
                    className="premium-input"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-phone" className="mb-1.5 block font-semibold text-foreground/90">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="contact-phone"
                    placeholder={config.contact.phone}
                    className="premium-input"
                  />
                </div>
                <div>
                  <label htmlFor="contact-subject" className="mb-1.5 block font-semibold text-foreground/90">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="contact-subject"
                    placeholder="How can we help?"
                    className="premium-input"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-message" className="mb-1.5 block font-semibold text-foreground/90">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  rows={5}
                  placeholder="Write your message here..."
                  className="premium-input resize-y"
                />
              </div>

              <button type="submit" className="premium-btn flex w-full items-center justify-center gap-2">
                Send Message <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </PageSection>

      <FaqSection />
    </PageShell>
  );
}
