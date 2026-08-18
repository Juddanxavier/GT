'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Clock, ArrowUpRight, Send, Building2 } from 'lucide-react';
import { FaqSection } from '@/components/sections/faq-section';

const contactInfo = [
  { icon: Mail, title: 'Email', value: 'support@gajantraders.com' },
  { icon: Phone, title: 'Phone', value: '+91 98765 43210' },
  { icon: Clock, title: 'Working Hours', value: 'Mon–Sat, 9 AM – 9 PM' },
];

export default function ContactPage(): ReactNode {

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden min-h-[400px] md:min-h-[500px] flex items-center bg-[#1a1a2e]">
        <div className="absolute inset-0">
          <img
            src="/images/contact.png"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e]/90 via-[#1a1a2e]/50 to-transparent" />
        </div>
        <div className="relative z-10 px-8 md:px-16 lg:px-24 pt-24 md:pt-28 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-flex items-center gap-2 text-base font-semibold uppercase tracking-[0.15em] text-[#F94735] mb-6">
              <span className="w-6 h-px bg-[#F94735]" />
              Contact Us
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-white max-w-2xl">
              Get in touch
              <br />
              <span className="text-[#F94735]">with our team.</span>
            </h1>
            <p className="mt-5 text-lg text-white/90 max-w-md leading-relaxed">
              Have a question, concern, or feedback? We&apos;re here to help — reach out anytime.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Info + Form */}
      <section className="relative bg-white">
        <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-16 md:py-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left */}
            <div>
              <span className="inline-flex items-center gap-2 text-base font-semibold uppercase tracking-[0.15em] text-[#F94735] mb-4">
                <span className="w-6 h-px bg-[#F94735]" />
                Reach Us
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-6">
                We&apos;d love <span className="text-[#F94735]">to hear from you.</span>
              </h2>
              <p className="text-lg text-foreground/90 leading-relaxed mb-10">
                Whether you need a quote, have a tracking query, or just want to say hello — our team is ready to assist.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mb-10">
                {contactInfo.map((c) => (
                  <div key={c.title} className="rounded-xl bg-surface border border-border p-5">
                    <div className="w-10 h-10 rounded-lg bg-[#F94735]/10 text-[#F94735] flex items-center justify-center mb-3">
                      <c.icon className="size-4" />
                    </div>
                    <p className="font-semibold text-foreground/80 uppercase tracking-wider mb-0.5">{c.title}</p>
                    <p className="text-lg font-medium text-foreground">{c.value}</p>
                  </div>
                ))}
                <a
                  href="/branches"
                  className="rounded-xl bg-[#F94735]/5 border border-[#F94735]/20 p-5 hover:bg-[#F94735]/10 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#F94735]/10 text-[#F94735] flex items-center justify-center mb-3">
                    <Building2 className="size-4" />
                  </div>
                  <p className=" font-semibold text-[#F94735] uppercase tracking-wider mb-0.5">Branches</p>
                  <p className="text-lg font-medium text-foreground group-hover:text-[#F94735] transition-colors">
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
                    <label className="block font-semibold text-foreground/90 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      placeholder="Your name"
                      className="w-full px-4 py-3 rounded-xl border border-border text-base text-foreground outline-none focus:ring-2 focus:ring-[#F94735]/20 focus:border-[#F94735] bg-white placeholder:text-foreground/60"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-foreground/90 mb-1.5">Email</label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-xl border border-border text-base text-foreground outline-none focus:ring-2 focus:ring-[#F94735]/20 focus:border-[#F94735] bg-white placeholder:text-foreground/60"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block font-semibold text-foreground/90 mb-1.5">Phone</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-3 rounded-xl border border-border text-base text-foreground outline-none focus:ring-2 focus:ring-[#F94735]/20 focus:border-[#F94735] bg-white placeholder:text-foreground/60"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-foreground/90 mb-1.5">Subject</label>
                    <input
                      type="text"
                      placeholder="How can we help?"
                      className="w-full px-4 py-3 rounded-xl border border-border text-base text-foreground outline-none focus:ring-2 focus:ring-[#F94735]/20 focus:border-[#F94735] bg-white placeholder:text-foreground/60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-foreground/90 mb-1.5">Message</label>
                  <textarea
                    rows={5}
                    placeholder="Write your message here..."
                    className="w-full px-4 py-3 rounded-xl border border-border text-base text-foreground outline-none focus:ring-2 focus:ring-[#F94735]/20 focus:border-[#F94735] bg-white placeholder:text-foreground/60 resize-y"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-3.5 rounded-xl bg-[#F94735] text-white text-base font-semibold hover:bg-[#D83220] transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
