'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Search, ArrowUpRight, HelpCircle } from 'lucide-react';
import { FileText, MessageSquare, Building2, HelpCircle as HelpCircleIcon } from 'lucide-react';
import Link from 'next/link';

const categories = [
  {
    label: 'General',
    icon: 'ðŸ“‹',
    items: [
      { q: 'What is Lanka Mahal?', a: 'Lanka Mahal is an international courier and logistics provider offering express and ocean freight services to 200+ destinations worldwide. We handle everything from documents and parcels to bulk cargo.' },
      { q: 'What countries do you ship to?', a: 'We deliver to over 200 destinations worldwide, including major corridors to the USA, UK, Canada, UAE, Saudi Arabia, Qatar, Kuwait, Singapore, Malaysia, Australia, and Europe. Contact us for a specific country check.' },
      { q: 'Do you have a branch near me?', a: 'We have multiple branches across Sri Lanka. Visit our Branches page to find the nearest location or simply schedule a free door-to-door pickup online.' },
      { q: 'What is the difference between air freight and ocean freight?', a: 'Air freight is faster (3â€“15 days) and ideal for urgent, smaller shipments. Ocean freight takes longer (3â€“30 days) but is more economical for heavy, bulky, or large-volume cargo.' },
    ],
  },
  {
    label: 'Shipping',
    icon: 'ðŸ“¦',
    items: [
      { q: 'How do I ship a parcel?', a: 'You can book a shipment online through our website, schedule a doorstep pickup, or drop off your parcel at any Lanka Mahal branch. We will handle the rest including documentation and customs clearance.' },
      { q: 'What is the weight limit for a shipment?', a: 'There is no strict upper limit. Small parcels, heavy cargo, and full container loads are all handled. For very heavy shipments, we recommend ocean freight for cost efficiency.' },
      { q: 'Can I ship documents internationally?', a: 'Yes. Document shipping is one of our core services. Documents are shipped via air freight with tracking and fast delivery.' },
      { q: 'Do you ship to PO boxes?', a: 'Most carriers require a physical address for delivery. PO box delivery may be possible in some countries - please check with our support team before booking.' },
      { q: 'Can I ship food items or perishables?', a: 'Perishable food items are generally not accepted due to spoilage risks during transit. Non-perishable packaged foods may be allowed depending on destination country regulations.' },
      { q: 'What items are prohibited?', a: 'Prohibited items include currency, hazardous materials, precious metals, weapons, narcotics, liquids, live animals, perishable foods, and legally restricted goods. See our Prohibited Items page for a full list.' },
    ],
  },
  {
    label: 'Tracking',
    icon: 'ðŸ”',
    items: [
      { q: 'How do I track my shipment?', a: 'Enter your tracking number on the Track page. You will see real-time status updates including current location, estimated delivery date, and a complete tracking history timeline.' },
      { q: 'My tracking has not updated in days. Why?', a: 'Tracking may pause during customs clearance, weekends, holidays, or when the shipment is in transit between facilities. If there is no update for 7+ days, please contact our support team.' },
      { q: 'What do the different statuses mean?', a: 'Pending - awaiting pickup. Info Received - carrier has shipping details. In Transit - on the move. Out for Delivery - last mile. Delivered - signed for. Exception - a delay or issue. Cancelled - shipment was cancelled.' },
      { q: 'Can I get SMS or email notifications?', a: 'Yes. Create an account and claim your shipment to receive automatic email and WhatsApp notifications on every status change.' },
      { q: 'What if my tracking number does not work?', a: 'Double-check the number for typos. If it still does not work, the shipment may not yet be registered in the system. Contact support and we will investigate.' },
    ],
  },
  {
    label: 'Services',
    icon: 'ðŸšš',
    items: [
      { q: 'What is volumetric weight and how is it calculated?', a: 'Volumetric (DIM) weight is calculated as (Length Ã— Width Ã— Height) Ã· 5000 for metric units. If the volumetric weight exceeds the actual weight, the chargeable weight will be the higher value. Use our Volumetric Calculator for instant results.' },
      { q: 'How long does air freight take?', a: 'Air freight delivery times range from 3â€“5 days for priority, 3â€“7 days for standard express, 4â€“7 days for regional, 8â€“12 days for economy, and 10â€“15 days for standard shipping depending on destination.' },
      { q: 'How long does ocean freight take?', a: 'Ocean freight transit depends on the route: Sri Lanka 3â€“5 days, Singapore 10â€“14 days, Malaysia 12â€“16 days, UK 22â€“28 days, Canada 25â€“30 days from Sri Lankan ports.' },
      { q: 'What is the difference between LCL and FCL?', a: 'LCL (Less than Container Load) means your cargo shares container space with other shipments - you pay only for the space you use. FCL (Full Container Load) gives you an entire container, ideal for bulk cargo.' },
      { q: 'Do you provide packaging services?', a: 'Yes. We offer packing guidance and trained professionals can carefully pack fragile, valuable, and important shipments. Contact us for specific packing requirements.' },
      { q: 'Can I insure my shipment?', a: 'Yes, cargo insurance is available as an optional add-on for both air and ocean freight shipments. It provides protection against loss or damage during transit.' },
    ],
  },
  {
    label: 'Billing',
    icon: 'ðŸ’°',
    items: [
      { q: 'How do I get a shipping quote?', a: 'Use the Get a Quote page to fill in your shipment details. Our team will respond with a competitive rate within 24 hours. You can also use our Volumetric Calculator to estimate dimensional weight beforehand.' },
      { q: 'What payment methods do you accept?', a: 'We accept bank transfers, credit/debit cards, and online payment methods. Payment terms for regular business accounts can be arranged separately.' },
      { q: 'Are there any hidden charges?', a: 'All applicable charges including freight, fuel surcharges, and documentation fees are communicated upfront in your quote. Customs duties and taxes at the destination are payable by the receiver.' },
      { q: 'How are customs duties handled?', a: 'We handle export documentation and customs clearance on the origin side. Duties, taxes, and import clearance at the destination are the receiver\'s responsibility. We provide guidance on what to expect.' },
      { q: 'Can I get an invoice for my shipment?', a: 'Yes. Invoices are generated for every shipment and are available in your account dashboard. You can view and download invoices from the My Invoices section.' },
    ],
  },
];

export default function FaqPage(): ReactNode {
  const [openFaqs, setOpenFaqs] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');

  function toggle(key: string) {
    setOpenFaqs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const allQuestions = categories.flatMap((cat) =>
    cat.items.map((item) => ({ ...item, category: cat.label }))
  );

  const filtered = search.trim()
    ? allQuestions.filter(
        (item) =>
          item.q.toLowerCase().includes(search.toLowerCase()) ||
          item.a.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  return (
    <div className="min-h-screen bg-white">
      <section className="w-screen left-[calc(-50vw+50%)] relative overflow-hidden min-h-[450px] md:min-h-[600px] flex items-center bg-[#1a1a2e]">
        <div className="absolute inset-0">
          <img src="/images/support.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e] via-[#1a1a2e]/70 to-transparent" />
        </div>
        <div className="relative z-10 px-8 md:px-16 lg:px-24 w-full">
          <span className="inline-flex items-center gap-2 text-base font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-3">
            <span className="w-6 h-px bg-[#F59E0B]" />
            FAQ
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Frequently Asked Questions</h1>
          <p className="text-lg text-white/90 max-w-lg mt-2">
            Find answers to common questions about shipping, tracking, services, and billing.
          </p>
        </div>
      </section>

      <section className="w-screen left-[calc(-50vw+50%)] relative bg-white">
        <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-12 md:py-16">
          <div className="grid md:grid-cols-[1fr_280px] gap-8 md:gap-12">
            <div>
              <div className="relative mb-10">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search FAQs..."
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-border text-lg text-foreground placeholder:text-foreground/40 outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] transition-all"
                />
              </div>

              {filtered ? (
                <div className="space-y-4">
                  <p className="text-foreground mb-4">
                    {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &quot;{search}&quot;
                  </p>
                  {filtered.length === 0 ? (
                    <div className="text-center py-16">
                      <HelpCircle size={48} className="mx-auto text-foreground/30 mb-4" />
                      <h2 className="text-2xl font-bold text-foreground mb-2">No results found</h2>
                      <p className="text-lg text-foreground">Try a different search term or browse the categories below.</p>
                    </div>
                  ) : (
                    filtered.map((item) => {
                      const key = `search-${item.q}`;
                      const isOpen = openFaqs[key];
                      return (
                        <div key={key} className="rounded-2xl border border-border bg-white overflow-hidden">
                          <button type="button" onClick={() => toggle(key)} className="w-full flex items-center justify-between p-5 text-left cursor-pointer">
                            <div>
                              <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">{item.category}</span>
                              <span className="text-lg font-medium text-foreground block mt-0.5">{item.q}</span>
                            </div>
                            <ChevronDown size={18} className={`text-foreground shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                          <div className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-40' : 'max-h-0'}`}>
                            <div className="px-5 pb-5">
                              <p className="text-lg text-foreground leading-relaxed">{item.a}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <button type="button" onClick={() => setSearch('')} className="text-sm font-semibold text-[#F59E0B] hover:underline cursor-pointer">
                    Clear search & browse all FAQs
                  </button>
                </div>
              ) : (
                <div className="space-y-12">
                  {categories.map((cat, ci) => (
                    <motion.div
                      key={cat.label}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: ci * 0.05, duration: 0.3 }}
                    >
                      <div id={`cat-${cat.label}`} className="flex items-center gap-3 mb-5 scroll-mt-24">
                        <span className="text-2xl">{cat.icon}</span>
                        <h2 className="text-2xl font-bold text-foreground">{cat.label}</h2>
                      </div>
                      <div className="space-y-3">
                        {cat.items.map((item) => {
                          const key = `${cat.label}-${item.q}`;
                          const isOpen = openFaqs[key];
                          return (
                            <div key={key} className="rounded-2xl border border-border bg-white overflow-hidden">
                              <button type="button" onClick={() => toggle(key)} className="w-full flex items-center justify-between p-5 text-left cursor-pointer">
                                <span className="text-lg font-medium text-foreground pr-4">{item.q}</span>
                                <ChevronDown size={18} className={`text-foreground shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                              </button>
                              <div className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-40' : 'max-h-0'}`}>
                                <div className="px-5 pb-5">
                                  <p className="text-lg text-foreground leading-relaxed">{item.a}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <div className="rounded-xl border border-border bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Categories</h3>
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => {
                        setSearch('');
                        document.getElementById(`cat-${cat.label}`)?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg text-base text-foreground hover:text-[#F59E0B] hover:bg-[#F59E0B]/5 transition-colors cursor-pointer"
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                      <span className="ml-auto text-sm text-foreground/60">{cat.items.length}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Quick Links</h3>
                <div className="space-y-2">
                  <a href="/quote" className="flex items-center gap-3 text-base text-foreground hover:text-[#F59E0B] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#F59E0B]/5"><FileText size={16} className="shrink-0" /> Get a Quote</a>
                  <a href="/contact" className="flex items-center gap-3 text-base text-foreground hover:text-[#F59E0B] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#F59E0B]/5"><MessageSquare size={16} className="shrink-0" /> Contact Support</a>
                  <a href="/branches" className="flex items-center gap-3 text-base text-foreground hover:text-[#F59E0B] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#F59E0B]/5"><Building2 size={16} className="shrink-0" /> Our Branches</a>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-[#F59E0B]/5 p-5">
                <HelpCircle size={28} className="text-[#F59E0B] mb-3" />
                <h3 className="text-base font-bold text-foreground mb-1">Still have questions?</h3>
                <p className="text-sm text-foreground leading-relaxed mb-4">Can&apos;t find what you&apos;re looking for? Reach out to our support team 24/7.</p>
                <div className="space-y-2">
                  <Link href="/contact" className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-[#F59E0B] text-white text-sm font-semibold hover:bg-[#D97706] transition-colors">
                    Contact Support <ArrowUpRight size={14} />
                  </Link>
                  <Link href="/track" className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-border text-foreground text-sm font-semibold hover:bg-surface transition-colors">
                    Track Shipment
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}

