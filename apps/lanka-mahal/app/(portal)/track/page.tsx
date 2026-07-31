'use client';

import type { ReactNode } from 'react';
import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, PackageSearch, MapPin, Clock, Truck, ChevronDown, ArrowUpRight, HelpCircle, FileText, MessageSquare, Building2 } from 'lucide-react';
import { Chip, Spinner } from '@heroui/react';
import { useTrackShipment } from '@/lib/queries';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  info_received: 'Info Received',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  delivery_failure: 'Delivery Failed',
  cancelled: 'Cancelled',
  exception: 'Exception',
};

const STATUS_COLORS: Record<string, 'warning' | 'accent' | 'success' | 'danger' | 'default'> = {
  pending: 'warning',
  info_received: 'accent',
  in_transit: 'warning',
  out_for_delivery: 'warning',
  delivered: 'success',
  delivery_failure: 'danger',
  cancelled: 'default',
  exception: 'danger',
};

export default function TrackPage(): ReactNode {
  const [trackingNo, setTrackingNo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { data: result, isFetching: loading, error: searchErrorObj } = useTrackShipment(searchQuery || undefined);
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
      <section className="w-screen left-[calc(-50vw+50%)] relative overflow-hidden min-h-[450px] md:min-h-[600px] flex items-center bg-[#1a1a2e]">
        <div className="absolute inset-0">
          <img src="/images/trackbg.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e] via-[#1a1a2e]/70 to-transparent" />
        </div>
        <div className="relative z-10 px-8 md:px-16 lg:px-24 pt-24 md:pt-28 pb-20 w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            <span className="inline-flex items-center gap-2 text-base font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-6">
              <span className="w-6 h-px bg-[#F59E0B]" />
              Track Shipment
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-white max-w-2xl">
              Track your shipment<br />
              <span className="text-[#F59E0B]">in real time.</span>
            </h1>
            <p className="mt-5 text-lg text-white/90 max-w-md leading-relaxed mb-8">
              Enter your tracking number to get live status updates and delivery timeline.
            </p>
            <form onSubmit={handleSubmit} className="flex gap-3 max-w-lg">
              <input value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} placeholder="Enter tracking number" className="flex-1 px-5 py-3.5 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm text-white text-lg placeholder:text-white/70 outline-none focus:ring-2 focus:ring-[#F59E0B]/40 focus:border-[#F59E0B] transition-all" />
              <button type="submit" className="px-6 py-3.5 rounded-xl bg-[#F59E0B] text-white text-lg font-semibold hover:bg-[#D97706] transition-colors flex items-center gap-2 cursor-pointer shrink-0">
                <Search size={18} /> Track
              </button>
            </form>
            <p className="mt-4 text-base text-white">Try: GT995423004, GT995070000</p>
          </motion.div>
        </div>
      </section>

      <div ref={resultsRef} className="w-screen left-[calc(-50vw+50%)] relative bg-white">
        <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-16">
          <div className="grid md:grid-cols-[280px_1fr] gap-8 md:gap-12">
            <aside className="space-y-6 order-last md:order-first">
              <div className="rounded-xl border border-border bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-3">Track Another</h3>
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} placeholder="Enter tracking no." className="flex-1 px-3 py-2 rounded-lg border border-border text-base text-foreground placeholder:text-foreground/60 outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B]" />
                  <button type="submit" className="px-3 py-2 rounded-lg bg-[#F59E0B] text-white text-base font-semibold hover:bg-[#D97706] transition-colors cursor-pointer"><Search size={16} /></button>
                </form>
              </div>
              <div className="rounded-xl border border-border bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-3">Quick Links</h3>
                <div className="space-y-2">
                  <a href="/quote" className="flex items-center gap-3 text-base text-foreground/85 hover:text-[#F59E0B] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#F59E0B]/5"><FileText size={16} className="shrink-0" /> Get a Quote</a>
                  <a href="/contact" className="flex items-center gap-3 text-base text-foreground/85 hover:text-[#F59E0B] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#F59E0B]/5"><MessageSquare size={16} className="shrink-0" /> Contact Support</a>
                  <a href="/branches" className="flex items-center gap-3 text-base text-foreground/85 hover:text-[#F59E0B] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#F59E0B]/5"><Building2 size={16} className="shrink-0" /> Our Branches</a>
                </div>
              </div>
              <div className="rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/10 p-5">
                <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center mb-3"><HelpCircle size={18} /></div>
                <h3 className="text-base font-bold text-foreground mb-1">Need help?</h3>
                <p className="text-sm text-foreground/80 leading-relaxed mb-3">Our support team is available Monâ€“Sat, 9 AM â€“ 9 PM.</p>
                <a href="tel:+919876543210" className="text-sm font-semibold text-[#F59E0B] hover:underline">+91 98765 43210</a>
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
                    <div className="w-14 h-14 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center shrink-0"><PackageSearch size={26} /></div>
                    <div>
                      <p className="font-mono text-xl font-bold text-foreground">{result.trackingNo}</p>
                      <Chip size="md" variant="soft" color={STATUS_COLORS[result.status] ?? 'default'} className="mt-1.5">{STATUS_LABELS[result.status] || result.status}</Chip>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-foreground/80">
                        {result.carrier && <span><Truck size={15} className="inline mr-1.5" />{result.carrier}</span>}
                        {(result.origin || result.destination) && <span><MapPin size={15} className="inline mr-1.5" />{result.origin || '?'} â†’ {result.destination || '?'}</span>}
                        {result.lastTrackedAt && <span><Clock size={15} className="inline mr-1.5" />Last updated {new Date(result.lastTrackedAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    {result.events.length === 0 ? (
                      <p className=" text-foreground/80 text-center py-8">No tracking events yet.</p>
                    ) : (
                      result.events.map((event, i) => (
                        <div key={i} className="flex gap-5 pb-8 relative last:pb-0">
                          {i < result.events.length - 1 && <div className="absolute left-[12px] top-7 bottom-0 w-0.5 bg-border" />}
                          <div className="flex flex-col items-center shrink-0">
                            <div className={`w-[24px] h-[24px] rounded-full border-2 flex items-center justify-center ${i === 0 ? 'border-[#F59E0B] bg-[#F59E0B]' : 'border-border bg-white'}`}>
                              {i === 0 && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 -mt-0.5">
                            <div className="flex items-center gap-3 flex-wrap">
                              <p className={`text-lg font-semibold ${i === 0 ? 'text-foreground' : 'text-foreground/90'}`}>{STATUS_LABELS[event.status] || event.status}</p>
                              <span className=" text-foreground/70">{new Date(event.eventTime).toLocaleString()}</span>
                            </div>
                            {event.description && <p className=" text-foreground/80 mt-1">{event.description}</p>}
                            {event.location && <p className=" text-foreground/70 mt-0.5">{event.location}</p>}
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
                  <h2 className="text-2xl font-bold text-foreground mb-2">Enter a tracking number</h2>
                  <p className="text-lg text-foreground/80">Use the search box above to track your shipment.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="w-screen left-[calc(-50vw+50%)] relative bg-white border-t border-border">
        <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-16 md:py-20">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-start">
            <div>
              <span className="inline-flex items-center gap-2 text-base font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-4">
                <span className="w-6 h-px bg-[#F59E0B]" />
                FAQ
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
                Tracking <span className="text-[#F59E0B]">FAQs</span>
              </h2>
              <p className=" text-foreground/90 leading-relaxed mb-6">Common questions about tracking shipments with Lanka Mahal.</p>
              <p className="text-foreground/80 leading-relaxed mb-10">Can&apos;t find your answer? Contact our support team.</p>
              <div className="border-t border-border pt-8">
                <h3 className="text-2xl font-bold tracking-tight text-foreground mb-2">Still need help?</h3>
                <p className=" text-foreground/90 mb-6">Get in touch for personalised support.</p>
                <a href="/contact" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#F59E0B] text-white text-base font-semibold hover:bg-[#D97706] transition-colors cursor-pointer w-fit">
                  Contact Support <ArrowUpRight size={16} />
                </a>
              </div>
            </div>
            <div className="space-y-0 border-t border-border">
              {[
                { q: 'How do I track my shipment?', a: 'Enter your tracking number in the search bar above. You will see real-time status updates and a complete tracking history timeline.' },
                { q: 'Where do I find my tracking number?', a: 'Your tracking number is provided when your shipment is created. Check your email, SMS, or account dashboard for the tracking number.' },
                { q: 'What do the statuses mean?', a: 'Pending - awaiting pickup. Info Received - carrier has shipping details. In Transit - on the move. Out for Delivery - last mile. Delivered - signed for. Exception - a delay or issue.' },
                { q: 'My tracking hasn\'t updated in days. Why?', a: 'Tracking may not update during customs clearance, holidays, or remote area transit. If it has been over 7 days, please contact support.' },
                { q: 'Can I get notifications on status changes?', a: 'Yes. Create an account and claim your shipment to receive email and WhatsApp notifications on every status change.' },
                { q: 'What if my tracking number doesn\'t work?', a: 'Double-check the number for typos. If it still does not work, the shipment may not have been registered yet. Contact support for assistance.' },
              ].map((f, i) => {
                const faqOpen = openFaq === i;
                return (
                  <div key={f.q} className="border-b border-border">
                    <button type="button" onClick={() => setOpenFaq(faqOpen ? null : i)} className="w-full flex items-center justify-between py-4 text-left cursor-pointer">
                      <span className="text-lg font-medium text-foreground pr-4">{f.q}</span>
                      <ChevronDown size={16} className={`text-foreground/70 shrink-0 transition-transform duration-200 ${faqOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-200 ${faqOpen ? 'max-h-40 pb-4' : 'max-h-0'}`}>
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

