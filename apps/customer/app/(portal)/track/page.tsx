'use client';

import { Chip, Spinner } from '@heroui/react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronDown,
  Clock,
  HelpCircle,
  MapPin,
  PackageSearch,
  Phone,
  Search,
  Truck,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { PageHero } from '@/components/page/page-hero';
import { PageSection, PageShell } from '@/components/page/page-section';
import { useTrackShipment } from '@/lib/queries';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/status';
import { useTenantConfig } from '@/lib/use-tenant-config';

export default function TrackPage(): ReactNode {
  const config = useTenantConfig();
  const [trackingNo, setTrackingNo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const {
    data: result,
    isFetching: loading,
    error: searchErrorObj,
  } = useTrackShipment(searchQuery || undefined);
  const searchError = searchErrorObj instanceof Error ? searchErrorObj.message : '';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingNo.trim()) return;
    setSearchQuery('');
    setTimeout(() => {
      setSearchQuery(trackingNo.trim());
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  return (
    <PageShell>
      <PageHero
        image="/images/trackbg.webp"
        eyebrow="Live Tracking"
        title={
          <>
            Where&apos;s your parcel? <span className="text-brand-accent">Let&apos;s find out.</span>
          </>
        }
        subtitle="Enter your tracking number for real-time status updates from pickup to doorstep."
        tall
      >
        <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              value={trackingNo}
              onChange={(e) => setTrackingNo(e.target.value)}
              placeholder="Enter tracking number"
              className="w-full rounded-xl border border-white/15 bg-white/[0.07] py-3.5 pl-11 pr-4 text-base text-white backdrop-blur-sm outline-none transition-all placeholder:text-white/40 focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/40"
            />
          </div>
          <button type="submit" className="premium-btn flex shrink-0 cursor-pointer items-center justify-center gap-2 sm:w-auto">
            Track <ArrowRight size={16} />
          </button>
        </form>
        <p className="mt-4 text-xs text-white/40">
          Your tracking number was given to you at the branch or sent via SMS/WhatsApp.
        </p>
      </PageHero>

      <div ref={resultsRef}>
        <PageSection>
          <div className="grid md:grid-cols-[280px_1fr] gap-8 md:gap-12">
            <aside className="space-y-5 order-last md:order-first">
              <div className="premium-card p-5">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">
                  Track Another
                </h3>
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={trackingNo}
                    onChange={(e) => setTrackingNo(e.target.value)}
                    placeholder="Tracking no."
                    className="flex-1 px-3 py-2 rounded-lg border border-foreground/10 text-base text-foreground placeholder:text-foreground/40 outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent"
                  />
                  <button
                    type="submit"
                    className="w-full sm:w-auto justify-center px-3 py-2 rounded-lg bg-brand-accent text-white text-base font-semibold hover:bg-brand-accent-hover transition-colors cursor-pointer"
                  >
                    <Search size={16} />
                  </button>
                </form>
              </div>
              <div className="premium-card p-5">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">
                  Quick Links
                </h3>
                <div className="space-y-0.5">
                  <a
                    href="/contact"
                    className="flex items-center gap-3 text-sm font-medium text-foreground/60 hover:text-foreground transition-colors px-2 py-2 rounded-lg hover:bg-foreground/[0.03]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" /> Get a Quote
                  </a>
                  <a
                    href="/contact"
                    className="flex items-center gap-3 text-sm font-medium text-foreground/60 hover:text-foreground transition-colors px-2 py-2 rounded-lg hover:bg-foreground/[0.03]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-accent/70" /> Contact Support
                  </a>
                  <a
                    href="/branches"
                    className="flex items-center gap-3 text-sm font-medium text-foreground/60 hover:text-foreground transition-colors px-2 py-2 rounded-lg hover:bg-foreground/[0.03]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" /> Our Branches
                  </a>
                </div>
              </div>
              <div className="rounded-2xl bg-brand-accent/5 border border-brand-accent/10 p-5">
                <div className="w-10 h-10 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center mb-3">
                  <HelpCircle size={18} />
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1">Need help?</h3>
                <p className="text-sm text-foreground/70 leading-relaxed mb-3">
                  Our support team is available Mon–Sat, 9 AM – 9 PM.
                </p>
                <a
                  href={config.contact.phoneHref}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-accent hover:underline"
                >
                  <Phone size={13} />
                  {config.contact.phone}
                </a>
              </div>
            </aside>

            <div>
              {loading ? (
                <div className="flex items-center justify-center min-h-[40vh]">
                  <Spinner size="lg" />
                </div>
              ) : searchQuery && searchError ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-20"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 border border-red-100 mb-5">
                    <PackageSearch size={28} className="text-red-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Shipment not found</h2>
                  <p className="text-base text-foreground/60 max-w-sm mx-auto">{searchError}</p>
                  <p className="text-sm text-foreground/40 mt-3">
                    Double-check the tracking number or contact support.
                  </p>
                </motion.div>
              ) : searchQuery && result ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  <div className="rounded-2xl border border-foreground/5 bg-brand-cream p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center shrink-0">
                        <PackageSearch size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-lg font-bold text-foreground">
                          {result.trackingNo}
                        </p>
                        <Chip
                          size="sm"
                          variant="soft"
                          color={STATUS_COLORS[result.status] ?? 'default'}
                          className="mt-1.5"
                        >
                          {STATUS_LABELS[result.status] || result.status}
                        </Chip>
                        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm text-foreground/70">
                          {result.carrier && (
                            <span className="flex items-center gap-1.5">
                              <Truck size={14} className="text-brand-accent" />
                              {result.carrier}
                            </span>
                          )}
                          {(result.origin || result.destination) && (
                            <span className="flex items-center gap-1.5">
                              <MapPin size={14} className="text-brand-accent" />
                              {result.origin || '?'} → {result.destination || '?'}
                            </span>
                          )}
                          {result.lastTrackedAt && (
                            <span className="flex items-center gap-1.5">
                              <Clock size={14} className="text-brand-accent" />
                              {new Date(result.lastTrackedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative pl-6">
                    {result.events.length === 0 ? (
                      <p className="text-foreground/60 text-center py-12">
                        No tracking events yet. Check back shortly.
                      </p>
                    ) : (
                      result.events.map((event, i) => (
                        <div
                          key={`${event.eventTime}-${event.description ?? ''}`}
                          className="relative pb-8 last:pb-0"
                        >
                          {i < result.events.length - 1 && (
                            <div className="absolute left-[-20px] top-4 bottom-0 w-px bg-border" />
                          )}
                          <div
                            className={`absolute left-[-24px] top-1 w-[10px] h-[10px] rounded-full border-2 ${
                              i === 0
                                ? 'border-brand-accent bg-brand-accent'
                                : 'border-border bg-white'
                            }`}
                          >
                            {i === 0 && (
                              <div className="absolute inset-[2px] rounded-full bg-white" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <p
                                className={`text-base font-semibold ${i === 0 ? 'text-foreground' : 'text-foreground/80'}`}
                              >
                                {STATUS_LABELS[event.status] || event.status}
                              </p>
                              <span className="text-sm text-foreground/50">
                                {new Date(event.eventTime).toLocaleString()}
                              </span>
                            </div>
                            {event.description && (
                              <p className="text-sm text-foreground/70 mt-0.5">
                                {event.description}
                              </p>
                            )}
                            {event.location && (
                              <p className="text-xs text-foreground/50 mt-0.5">
                                {event.location}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              ) : searchQuery ? null : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-foreground/[0.03] border border-border mb-5">
                    <PackageSearch size={28} className="text-foreground/30" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    Enter a tracking number to get started
                  </h2>
                  <p className="text-base text-foreground/50 max-w-sm mx-auto">
                    Your tracking number was given to you at the branch or sent via SMS/WhatsApp.
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </PageSection>
      </div>

      <PageSection cream>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              How tracking <span className="text-brand-accent">works.</span>
            </h2>
            <p className="mt-3 text-base text-foreground/60 max-w-md mx-auto">
              From drop-off to delivery, your parcel is tracked at every step.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                step: '01',
                icon: PackageSearch,
                title: 'Drop Off',
                desc: 'Bring your parcel to either Chennai branch and get a tracking number instantly.',
              },
              {
                step: '02',
                icon: Truck,
                title: 'In Transit',
                desc: 'Your parcel is scanned at each checkpoint — origin, transit hubs, and customs.',
              },
              {
                step: '03',
                icon: MapPin,
                title: 'Out for Delivery',
                desc: 'Once it reaches the destination country, local delivery takes over with live updates.',
              },
              {
                step: '04',
                icon: Clock,
                title: 'Delivered',
                desc: 'You get a confirmation with timestamp. Track the full journey anytime right here.',
              },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="premium-card premium-card-hover relative p-6"
              >
                <span className="text-3xl font-black text-brand-accent/10 absolute top-4 right-4">
                  {s.step}
                </span>
                <div className="w-10 h-10 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center mb-4">
                  <s.icon className="size-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">{s.title}</h3>
                <p className="text-sm text-foreground/60 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
      </PageSection>

      <PageSection>
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-start">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent mb-6">
                <span className="w-6 h-px bg-brand-accent" />
                FAQ
              </span>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
                Tracking <span className="text-brand-accent">FAQs</span>
              </h2>
              <p className="text-base text-foreground/70 leading-relaxed mb-6">
                Common questions about tracking shipments with Gajan Traders.
              </p>
              <p className="text-base text-foreground/60 leading-relaxed mb-10">
                Can&apos;t find your answer? Contact our support team.
              </p>
              <div className="border-t border-border pt-8">
                <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">
                  Still need help?
                </h3>
                <p className="text-base text-foreground/70 mb-6">
                  Get in touch for personalised support.
                </p>
                <a
                  href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-accent text-white text-sm font-semibold hover:bg-brand-accent-hover transition-colors cursor-pointer"
                >
                  Contact Support <ArrowRight size={14} />
                </a>
              </div>
            </div>
            <div className="space-y-0 border-t border-border">
              {[
                {
                  q: 'How do I track my shipment?',
                  a: 'Enter your tracking number in the search bar above. You will see real-time status updates and a complete tracking history timeline.',
                },
                {
                  q: 'Where do I find my tracking number?',
                  a: 'Your tracking number is provided when your shipment is created. Check your email, SMS, or account dashboard for the tracking number.',
                },
                {
                  q: 'What do the statuses mean?',
                  a: 'Pending — awaiting pickup. Info Received — carrier has shipping details. In Transit — on the move. Out for Delivery — last mile. Delivered — signed for. Exception — a delay or issue.',
                },
                {
                  q: "My tracking hasn't updated in days. Why?",
                  a: 'Tracking may not update during customs clearance, holidays, or remote area transit. If it has been over 7 days, please contact support.',
                },
                {
                  q: 'Can I get notifications on status changes?',
                  a: 'Yes. Create an account and claim your shipment to receive email and WhatsApp notifications on every status change.',
                },
                {
                  q: "What if my tracking number doesn't work?",
                  a: 'Double-check the number for typos. If it still does not work, the shipment may not have been registered yet. Contact support for assistance.',
                },
              ].map((f) => {
                const faqOpen = openFaq === f.q;
                return (
                  <div key={f.q} className="border-b border-border">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(faqOpen ? null : f.q)}
                      className="w-full flex items-center justify-between py-4 text-left cursor-pointer"
                    >
                      <span className="text-base font-medium text-foreground pr-4">{f.q}</span>
                      <ChevronDown
                        size={16}
                        className={`text-foreground/50 shrink-0 transition-transform duration-200 ${faqOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-200 ${faqOpen ? 'max-h-40 pb-4' : 'max-h-0'}`}
                    >
                      <p className="text-sm text-foreground/70 leading-relaxed">{f.a}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
      </PageSection>
    </PageShell>
  );
}
