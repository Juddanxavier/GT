'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, Building2, Clock, Mail, Phone, Send } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
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
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden min-h-[400px] md:min-h-[500px] flex items-center bg-[#1a1a2e]">
        <div className="absolute inset-0">
          <Image src="/images/contact.webp" alt="" fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-[#1a1a2e]/70" />
          
        </div>
        <div className="relative z-10 px-5 sm:px-8 md:px-16 lg:px-24 pt-28 md:pt-32 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#E8621A] mb-6">
              <span className="w-6 h-px bg-[#E8621A]" />
              Contact Us
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.08] text-white">
              Get in touch
              <br />
              <span className="text-[#E8621A]">with our team.</span>
            </h1>
            <p className="mt-5 text-base text-white/65 max-w-md leading-relaxed">
              Have a question, concern, or feedback? We&apos;re here to help — reach out anytime.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Info + Form */}
      <section className="relative bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left */}
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#E8621A] mb-6">
                <span className="w-6 h-px bg-[#E8621A]" />
                Reach Us
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-6">
                We&apos;d love <span className="text-[#E8621A]">to hear from you.</span>
              </h2>
              <p className="text-lg text-foreground/90 leading-relaxed mb-10">
                Whether you need a quote, have a tracking query, or just want to say hello — our
                team is ready to assist.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mb-10">
                {contactInfo.map((c) => (
                  <div key={c.title} className="rounded-xl bg-surface border border-border p-5">
                    <div className="w-10 h-10 rounded-lg bg-[#E8621A]/10 text-[#E8621A] flex items-center justify-center mb-3">
                      <c.icon className="size-4" />
                    </div>
                    <p className="font-semibold text-foreground/80 uppercase tracking-wider mb-0.5">
                      {c.title}
                    </p>
                    <p className="text-lg font-medium text-foreground">{c.value}</p>
                  </div>
                ))}
                <a
                  href="/branches"
                  className="rounded-xl bg-[#E8621A]/5 border border-[#E8621A]/20 p-5 hover:bg-[#E8621A]/10 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#E8621A]/10 text-[#E8621A] flex items-center justify-center mb-3">
                    <Building2 className="size-4" />
                  </div>
                  <p className=" font-semibold text-[#E8621A] uppercase tracking-wider mb-0.5">
                    Branches
                  </p>
                  <p className="text-lg font-medium text-foreground group-hover:text-[#E8621A] transition-colors">
                    Chennai — 2 locations <ArrowUpRight size={12} className="inline" />
                  </p>
                </a>
              </div>
            </div>

            {/* Right: Form */}
            <div>
              <form
                onSubmit={(e) => e.preventDefault()}
                className="rounded-2xl bg-white border border-border p-8 shadow-[0_2px_12px_rgba(0,0,0,0.06)] space-y-5"
              >
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block font-semibold text-foreground/90 mb-1.5"
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="contact-name"
                      placeholder="Your name"
                      className="w-full px-4 py-3 rounded-xl border border-border text-base text-foreground outline-none focus:ring-2 focus:ring-[#E8621A]/20 focus:border-[#E8621A] bg-white placeholder:text-foreground/60"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block font-semibold text-foreground/90 mb-1.5"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="contact-email"
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-xl border border-border text-base text-foreground outline-none focus:ring-2 focus:ring-[#E8621A]/20 focus:border-[#E8621A] bg-white placeholder:text-foreground/60"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="contact-phone"
                      className="block font-semibold text-foreground/90 mb-1.5"
                    >
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="contact-phone"
                      placeholder={config.contact.phone}
                      className="w-full px-4 py-3 rounded-xl border border-border text-base text-foreground outline-none focus:ring-2 focus:ring-[#E8621A]/20 focus:border-[#E8621A] bg-white placeholder:text-foreground/60"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="contact-subject"
                      className="block font-semibold text-foreground/90 mb-1.5"
                    >
                      Subject
                    </label>
                    <input
                      type="text"
                      id="contact-subject"
                      placeholder="How can we help?"
                      className="w-full px-4 py-3 rounded-xl border border-border text-base text-foreground outline-none focus:ring-2 focus:ring-[#E8621A]/20 focus:border-[#E8621A] bg-white placeholder:text-foreground/60"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="contact-message"
                    className="block font-semibold text-foreground/90 mb-1.5"
                  >
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    rows={5}
                    placeholder="Write your message here..."
                    className="w-full px-4 py-3 rounded-xl border border-border text-base text-foreground outline-none focus:ring-2 focus:ring-[#E8621A]/20 focus:border-[#E8621A] bg-white placeholder:text-foreground/60 resize-y"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-3.5 rounded-full bg-[#E8621A] text-white text-base font-semibold hover:bg-[#C45016] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  Send Message <Send size={16} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <FaqSection />
    </div>
  );
}
