'use client';

import { Chip, Spinner } from '@heroui/react';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  ChevronDown,
  Clock,
  HelpCircle,
  MapPin,
  PackageSearch,
  Search,
  Truck,
} from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
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
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden min-h-[450px] md:min-h-[600px] flex items-center bg-[#1a1a2e]">
        <div className="absolute inset-0">
          <Image
            src="/images/trackbg.webp"
            alt=""
            fill
            sizes="100vw"
            className="object-cover hidden md:block"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e]/90 via-[#1a1a2e]/50 to-[#1a1a2e]/15" />
        </div>
        <div className="relative z-10 px-5 sm:px-8 md:px-16 lg:px-24 pt-24 md:pt-28 pb-20 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-[#F94735] mb-6">
              <span className="w-6 h-px bg-[#F94735]" />
              Track Shipment
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.08] text-white max-w-2xl">
              Track your shipment
              <br />
              <span className="text-[#F94735]">in real time.</span>
            </h1>
            <p className="mt-5 text-base text-white/75 max-w-md leading-relaxed mb-8">
              Enter your tracking number to get live status updates and delivery timeline.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg">
              <input
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
                placeholder="Enter tracking number"
                className="flex-1 min-w-0 px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm text-white text-base sm:text-lg placeholder:text-white/70 outline-none focus:ring-2 focus:ring-[#F94735]/40 focus:border-[#F94735] transition-all"
              />
              <button
                type="submit"
                className="w-full sm:w-auto justify-center px-5 py-3 sm:px-6 sm:py-3.5 rounded-full bg-[#F94735] text-white text-base sm:text-lg font-semibold hover:bg-[#D83220] transition-colors flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Search size={18} /> Track
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      <div ref={resultsRef} className="relative bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16">
          <div className="grid md:grid-cols-[280px_1fr] gap-8 md:gap-12">
            <aside className="space-y-6 order-last md:order-first">
              <div className="rounded-2xl border border-foreground/5 bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
                  Track Another
                </h3>
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={trackingNo}
                    onChange={(e) => setTrackingNo(e.target.value)}
                    placeholder="Enter tracking no."
                    className="flex-1 px-3 py-2 rounded-lg border border-foreground/10 text-base text-foreground placeholder:text-foreground/40 outline-none focus:ring-2 focus:ring-[#F94735]/20 focus:border-[#F94735]"
                  />
                  <button
                    type="submit"
                    className="w-full sm:w-auto justify-center px-3 py-2 rounded-full bg-[#F94735] text-white text-base font-semibold hover:bg-[#D83220] transition-colors cursor-pointer"
                  >
                    <Search size={16} />
                  </button>
                </form>
              </div>
              <div className="rounded-2xl border border-foreground/5 bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
                  Quick Links
                </h3>
                <div className="space-y-1">
                  <a
                    href="/contact"
                    className="flex items-center gap-3 text-sm font-medium text-foreground/60 hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-foreground/[0.03]"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#F94735]" /> Get a Quote
                  </a>
                  <a
                    href="/contact"
                    className="flex items-center gap-3 text-sm font-medium text-foreground/60 hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-foreground/[0.03]"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#F94735]/70" /> Contact Support
                  </a>
                  <a
                    href="/branches"
                    className="flex items-center gap-3 text-sm font-medium text-foreground/60 hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-foreground/[0.03]"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#F94735]" /> Our Branches
                  </a>
                </div>
              </div>
              <div className="rounded-2xl bg-[#F94735]/5 border border-[#F94735]/10 p-5">
                <div className="w-10 h-10 rounded-lg bg-[#F94735]/10 text-[#F94735] flex items-center justify-center mb-3">
                  <HelpCircle size={18} />
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1">Need help?</h3>
                <p className="text-sm text-foreground/80 leading-relaxed mb-3">
                  Our support team is available Mon–Sat, 9 AM – 9 PM.
                </p>
                <a
                  href={config.contact.phoneHref}
                  className="text-sm font-semibold text-[#F94735] hover:underline"
                >
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
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50 border border-red-100 mb-4">
                    <PackageSearch size={28} className="text-red-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Shipment not found</h2>
                  <p className="text-lg text-foreground/80">{searchError}</p>
                </div>
              ) : searchQuery && result ? (
                <div className="space-y-8">
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-full bg-[#F94735]/10 text-[#F94735] flex items-center justify-center shrink-0">
                      <PackageSearch size={26} />
                    </div>
                    <div>
                      <p className="font-mono text-xl font-bold text-foreground">
                        {result.trackingNo}
                      </p>
                      <Chip
                        size="md"
                        variant="soft"
                        color={STATUS_COLORS[result.status] ?? 'default'}
                        className="mt-1.5"
                      >
                        {STATUS_LABELS[result.status] || result.status}
                      </Chip>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-foreground/80">
                        {result.carrier && (
                          <span>
                            <Truck size={15} className="inline mr-1.5" />
                            {result.carrier}
                          </span>
                        )}
                        {(result.origin || result.destination) && (
                          <span>
                            <MapPin size={15} className="inline mr-1.5" />
                            {result.origin || '?'} → {result.destination || '?'}
                          </span>
                        )}
                        {result.lastTrackedAt && (
                          <span>
                            <Clock size={15} className="inline mr-1.5" />
                            Last updated {new Date(result.lastTrackedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    {result.events.length === 0 ? (
                      <p className="text-foreground/80 text-center py-8">No tracking events yet.</p>
                    ) : (
                      result.events.map((event, i) => (
                        <div
                          key={`${event.eventTime}-${event.description ?? ''}`}
                          className="flex gap-5 pb-8 relative last:pb-0"
                        >
                          {i < result.events.length - 1 && (
                            <div className="absolute left-[12px] top-7 bottom-0 w-0.5 bg-border" />
                          )}
                          <div className="flex flex-col items-center shrink-0">
                            <div
                              className={`w-[24px] h-[24px] rounded-full border-2 flex items-center justify-center ${i === 0 ? 'border-[#F94735] bg-[#F94735]' : 'border-border bg-white'}`}
                            >
                              {i === 0 && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 -mt-0.5">
                            <div className="flex items-center gap-3 flex-wrap">
                              <p
                                className={`text-lg font-semibold ${i === 0 ? 'text-foreground' : 'text-foreground/90'}`}
                              >
                                {STATUS_LABELS[event.status] || event.status}
                              </p>
                              <span className="text-foreground/70">
                                {new Date(event.eventTime).toLocaleString()}
                              </span>
                            </div>
                            {event.description && (
                              <p className="text-foreground/80 mt-1">{event.description}</p>
                            )}
                            {event.location && (
                              <p className="text-foreground/70 mt-0.5">{event.location}</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : searchQuery ? null : (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-foreground/5 border border-border mb-4">
                    <PackageSearch size={28} className="text-foreground/60" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Enter a tracking number
                  </h2>
                  <p className="text-lg text-foreground/80">
                    Use the search box above to track your shipment.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="relative bg-white border-t border-border">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-start">
            <div>
              <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-[#F94735] mb-4">
                <span className="w-6 h-px bg-[#F94735]" />
                FAQ
              </span>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
                Tracking <span className="text-[#F94735]">FAQs</span>
              </h2>
              <p className="text-lg text-foreground/90 leading-relaxed mb-6">
                Common questions about tracking shipments with Gajan Traders.
              </p>
              <p className="text-lg text-foreground/80 leading-relaxed mb-10">
                Can&apos;t find your answer? Contact our support team.
              </p>
              <div className="border-t border-border pt-8">
                <h3 className="text-2xl font-bold tracking-tight text-foreground mb-2">
                  Still need help?
                </h3>
                <p className="text-lg text-foreground/90 mb-6">
                  Get in touch for personalised support.
                </p>
                <a
                  href="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#F94735] text-white text-base font-semibold hover:bg-[#D83220] transition-colors cursor-pointer w-fit"
                >
                  Contact Support <ArrowUpRight size={16} />
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
                      <span className="text-lg font-medium text-foreground pr-4">{f.q}</span>
                      <ChevronDown
                        size={16}
                        className={`text-foreground/70 shrink-0 transition-transform duration-200 ${faqOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-200 ${faqOpen ? 'max-h-40 pb-4' : 'max-h-0'}`}
                    >
                      <p className="text-lg text-foreground/90 leading-relaxed">{f.a}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
