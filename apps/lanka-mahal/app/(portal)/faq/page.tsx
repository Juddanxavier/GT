'use client';

import {
  ArrowUpRight,
  Building2,
  ChevronRight,
  ClipboardList,
  FileText,
  HelpCircle,
  MessageSquare,
  Package,
  Receipt,
  Search,
  Ship,
} from 'lucide-react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { FaqAccordion } from '@/components/faq-accordion';
import { PageHero } from '@/components/page/page-hero';
import { PageSection, PageShell } from '@/components/page/page-section';
import { SectionIntro } from '@/components/sections/section-intro';

interface FaqCategory {
  label: string;
  icon: LucideIcon;
  items: { q: string; a: string }[];
}

const categories: FaqCategory[] = [
  {
    label: 'General',
    icon: ClipboardList,
    items: [
      {
        q: 'What is Lanka Mahal?',
        a: 'Lanka Mahal is an international courier and logistics provider offering express and ocean freight services to 200+ destinations worldwide. We handle everything from documents and parcels to bulk cargo.',
      },
      {
        q: 'What countries do you ship to?',
        a: 'We deliver to over 200 destinations worldwide, including major corridors to the USA, UK, Canada, UAE, Saudi Arabia, Qatar, Kuwait, Singapore, Malaysia, Sri Lanka, Australia, and Europe. Contact us for a specific country check.',
      },
      {
        q: 'Do you have a branch near me?',
        a: 'We have branches across Sri Lanka. Visit our Branches page to find the nearest location, or schedule a doorstep pickup within 5 km of an office (conditions apply).',
      },
      {
        q: 'What is the difference between air freight and ocean freight?',
        a: 'Air freight is faster (3–15 days) and ideal for urgent, smaller shipments. Ocean freight takes longer (3–30 days) but is more economical for heavy, bulky, or large-volume cargo.',
      },
    ],
  },
  {
    label: 'Shipping',
    icon: Package,
    items: [
      {
        q: 'How do I ship a parcel?',
        a: 'Book online, schedule a pickup within 5 km of our offices (conditions apply), or drop off your parcel at a Lanka Mahal branch. We handle documentation and customs clearance.',
      },
      {
        q: 'What is the weight limit for a shipment?',
        a: 'There is no strict upper limit. Small parcels, heavy cargo, and full container loads are all handled. For very heavy shipments, we recommend ocean freight for cost efficiency.',
      },
      {
        q: 'Can I ship documents internationally?',
        a: 'Yes. Document shipping is one of our core services. Documents are shipped via air freight with tracking and fast delivery.',
      },
      {
        q: 'Do you ship to PO boxes?',
        a: 'Most carriers require a physical address for delivery. PO box delivery may be possible in some countries — please check with our support team before booking.',
      },
      {
        q: 'Can I ship food items or perishables?',
        a: 'Perishable food items are generally not accepted due to spoilage risks during transit. Non-perishable packaged foods may be allowed depending on destination country regulations.',
      },
      {
        q: 'What items are prohibited?',
        a: 'Prohibited items include currency, hazardous materials, precious metals, weapons, narcotics, liquids, live animals, perishable foods, and legally restricted goods. See our Prohibited Items page for a full list.',
      },
    ],
  },
  {
    label: 'Tracking',
    icon: Search,
    items: [
      {
        q: 'How do I track my shipment?',
        a: 'Enter your tracking number on the Track page. You will see real-time status updates including current location, estimated delivery date, and a complete tracking history timeline.',
      },
      {
        q: 'My tracking has not updated in days. Why?',
        a: 'Tracking may pause during customs clearance, weekends, holidays, or when the shipment is in transit between facilities. If there is no update for 7+ days, please contact our support team.',
      },
      {
        q: 'What do the different statuses mean?',
        a: 'Pending — awaiting pickup. Info Received — carrier has shipping details. In Transit — on the move. Out for Delivery — last mile. Delivered — signed for. Exception — a delay or issue. Cancelled — shipment was cancelled.',
      },
      {
        q: 'Can I get SMS or email notifications?',
        a: 'Yes. Create an account and claim your shipment to receive automatic email and WhatsApp notifications on every status change.',
      },
      {
        q: 'What if my tracking number does not work?',
        a: 'Double-check the number for typos. If it still does not work, the shipment may not yet be registered in the system. Contact support and we will investigate.',
      },
    ],
  },
  {
    label: 'Services',
    icon: Ship,
    items: [
      {
        q: 'What is volumetric weight and how is it calculated?',
        a: 'Volumetric (DIM) weight is calculated as (Length × Width × Height) ÷ 5000 for metric units. If the volumetric weight exceeds the actual weight, the chargeable weight will be the higher value. Use our Volumetric Calculator for instant results.',
      },
      {
        q: 'How long does air freight take?',
        a: 'Air freight delivery times range from 3–5 days for priority, 3–7 days for standard express, 4–7 days for regional, 8–12 days for economy, and 10–15 days for standard shipping depending on destination.',
      },
      {
        q: 'How long does ocean freight take?',
        a: 'Ocean freight transit depends on the route: Sri Lanka 3–5 days, Singapore 10–14 days, Malaysia 12–16 days, UK 22–28 days, Canada 25–30 days from Sri Lankan ports.',
      },
      {
        q: 'What is the difference between LCL and FCL?',
        a: 'LCL (Less than Container Load) means your cargo shares container space with other shipments — you pay only for the space you use. FCL (Full Container Load) gives you an entire container, ideal for bulk cargo.',
      },
      {
        q: 'Do you provide packaging services?',
        a: 'Yes. We offer packing guidance and trained professionals can carefully pack fragile, valuable, and important shipments. Contact us for specific packing requirements.',
      },
      {
        q: 'Can I insure my shipment?',
        a: 'Yes, cargo insurance is available as an optional add-on for both air and ocean freight shipments. It provides protection against loss or damage during transit.',
      },
    ],
  },
  {
    label: 'Billing',
    icon: Receipt,
    items: [
      {
        q: 'How do I get a shipping quote?',
        a: 'Use the Check Price page to fill in your shipment details. Our team will respond with a competitive rate within 24 hours. You can also use our Volumetric Calculator to estimate dimensional weight beforehand.',
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept bank transfers, credit/debit cards, and online payment methods. Payment terms for regular business accounts can be arranged separately.',
      },
      {
        q: 'Are there any hidden charges?',
        a: 'All applicable charges including freight, fuel surcharges, and documentation fees are communicated upfront in your quote. Customs duties and taxes at the destination are payable by the receiver.',
      },
      {
        q: 'How are customs duties handled?',
        a: "We handle export documentation and customs clearance on the origin side. Duties, taxes, and import clearance at the destination are the receiver's responsibility. We provide guidance on what to expect.",
      },
      {
        q: 'Can I get an invoice for my shipment?',
        a: 'Yes. Invoices are generated for every shipment and are available in your account dashboard. You can view and download invoices from the My Invoices section.',
      },
    ],
  },
];

export default function FaqPage(): ReactNode {
  const [openFaqs, setOpenFaqs] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  function toggle(key: string) {
    setOpenFaqs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const allQuestions = useMemo(
    () =>
      categories.flatMap((cat) =>
        cat.items.map((item) => ({ ...item, category: cat.label })),
      ),
    [],
  );

  const searchTerm = search.trim().toLowerCase();
  const searchResults = searchTerm
    ? allQuestions.filter(
        (item) =>
          item.q.toLowerCase().includes(searchTerm) ||
          item.a.toLowerCase().includes(searchTerm),
      )
    : null;

  const visibleCategories = activeCategory
    ? categories.filter((c) => c.label === activeCategory)
    : categories;

  return (
    <PageShell>
      <PageHero
        image="/images/contact.webp"
        eyebrow="Help Center"
        title={
          <>
            Frequently asked
            <br />
            <span className="text-brand-accent">questions.</span>
          </>
        }
        subtitle="Answers on shipping, tracking, services, and billing — or reach our team anytime."
        tall
      >
        <div className="relative mt-2 max-w-xl">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
          />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveCategory(null);
            }}
            placeholder="Search questions..."
            className="w-full rounded-xl border border-white/15 bg-white/10 py-3.5 pl-11 pr-4 text-base text-white backdrop-blur-sm outline-none transition-all placeholder:text-white/40 focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/40"
          />
        </div>
      </PageHero>

      <PageSection>
        <div className="grid gap-10 lg:grid-cols-[1fr_280px] lg:gap-12">
          <div className="min-w-0">
            {!searchResults && (
              <div className="mb-8 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  className={`min-h-11 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    activeCategory === null
                      ? 'bg-brand-accent text-white'
                      : 'bg-brand-cream text-foreground/70 hover:bg-brand-accent/10 hover:text-brand-accent'
                  }`}
                >
                  All topics
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => setActiveCategory(cat.label)}
                    className={`inline-flex items-center gap-1.5 min-h-11 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      activeCategory === cat.label
                        ? 'bg-brand-accent text-white'
                        : 'bg-brand-cream text-foreground/70 hover:bg-brand-accent/10 hover:text-brand-accent'
                    }`}
                  >
                    <cat.icon size={14} />
                    {cat.label}
                  </button>
                ))}
              </div>
            )}

            {searchResults ? (
              <div>
                <SectionIntro
                  eyebrow="Search"
                  title={`${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`}
                  subtitle={search ? `Showing matches for "${search.trim()}"` : undefined}
                  className="mb-8"
                />
                {searchResults.length === 0 ? (
                  <div className="premium-card py-16 text-center">
                    <HelpCircle size={40} className="mx-auto mb-4 text-brand-accent/40" />
                    <h2 className="text-xl font-semibold text-foreground">No results found</h2>
                    <p className="mt-2 text-muted">
                      Try a different search term or browse by category.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:text-brand-accent-hover"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <>
                    <FaqAccordion
                      items={searchResults}
                      openKeys={openFaqs}
                      onToggle={toggle}
                      keyPrefix="search-"
                    />
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:text-brand-accent-hover"
                    >
                      Clear search & browse all FAQs
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-14">
                {visibleCategories.map((cat) => (
                  <div key={cat.label} id={`cat-${cat.label}`} className="scroll-mt-28">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-accent/10 text-brand-accent">
                        <cat.icon size={20} />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-foreground">{cat.label}</h2>
                        <p className="text-sm text-muted">{cat.items.length} questions</p>
                      </div>
                    </div>
                    <FaqAccordion
                      items={cat.items}
                      openKeys={openFaqs}
                      onToggle={toggle}
                      keyPrefix={`${cat.label}-`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <div className="premium-card p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">
                Jump to topic
              </h3>
              <div className="space-y-0.5">
                {categories.map((cat) => (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setActiveCategory(cat.label);
                      document
                        .getElementById(`cat-${cat.label}`)
                        ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`flex w-full cursor-pointer items-center gap-2 min-h-11 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                      activeCategory === cat.label
                        ? 'bg-brand-accent/10 font-semibold text-brand-accent'
                        : 'text-foreground/70 hover:bg-brand-cream hover:text-foreground'
                    }`}
                  >
                    <cat.icon size={15} className="shrink-0" />
                    <span className="flex-1">{cat.label}</span>
                    <span className="text-xs text-muted">{cat.items.length}</span>
                    <ChevronRight size={14} className="text-muted" />
                  </button>
                ))}
              </div>
            </div>

            <div className="premium-card p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">
                Quick links
              </h3>
              <div className="space-y-1">
                {[
                  { href: '/check-price', icon: FileText, label: 'Check Price' },
                  { href: '/contact', icon: MessageSquare, label: 'Contact Support' },
                  { href: '/branches', icon: Building2, label: 'Our Branches' },
                ].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-foreground/70 transition-colors hover:bg-brand-cream hover:text-brand-accent"
                  >
                    <link.icon size={15} />
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-brand-accent/5 p-5 ring-1 ring-brand-accent/10">
              <HelpCircle size={24} className="mb-3 text-brand-accent" />
              <h3 className="text-base font-semibold text-foreground">Still have questions?</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Our support team is available Mon–Sat, 9 AM – 9 PM.
              </p>
              <div className="mt-4 space-y-2">
                <Link
                  href="/contact"
                  className="premium-btn flex w-full items-center justify-center gap-2 text-sm"
                >
                  Contact Support <ArrowUpRight size={14} />
                </Link>
                <Link
                  href="/track"
                  className="premium-btn-ghost flex w-full items-center justify-center gap-2 border-border text-sm text-foreground"
                >
                  Track Shipment
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </PageSection>
    </PageShell>
  );
}
