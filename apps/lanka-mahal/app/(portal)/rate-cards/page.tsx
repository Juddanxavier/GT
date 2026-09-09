'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  Box,
  ChevronDown,
  Clock,
  DollarSign,
  Globe,
  Headphones,
  HelpCircle,
  Info,
  Package,
  Phone,
  Scale,

  Shield,
  Truck,
  Zap,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { PageHero } from '@/components/page/page-hero';
import { PageSection, PageShell } from '@/components/page/page-section';
import { useTenantConfig } from '@/lib/use-tenant-config';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface ShippingRate {
  id: string;
  serviceType: string;
  weightFrom: string;
  weightTo: string;
  rate: string;
}

interface PriceData {
  destinationCountry: string;
  currency: string;
  updatedAt: string;
  rates: ShippingRate[];
}

const SERVICE_META: Record<string, { label: string; tat: string; color: string }> = {
  'express-priority': { label: 'GT Express Priority', tat: '3–5 days', color: '#E8621A' },
  'express-saver': { label: 'GT Express Saver', tat: '3–7 days', color: '#F59E0B' },
  'express-edge': { label: 'GT Express Edge', tat: '4–7 days', color: '#8B5CF6' },
  economy: { label: 'GT Express Economy', tat: '7–12 days', color: '#10B981' },
  standard: { label: 'GT Express Standard', tat: '10–15 days', color: '#3B82F6' },
  ocean: { label: 'Ocean Freight', tat: '20–35 days', color: '#3B82F6' },
};

const factors = [
  { icon: Scale, title: 'Weight & Dimensions', desc: 'Rates are based on actual or volumetric weight — whichever is higher.' },
  { icon: Zap, title: 'Delivery Speed', desc: 'Express carries a premium for faster delivery. Economy costs less with longer transit.' },
  { icon: Shield, title: 'Customs & Duties', desc: 'Destination country charges are additional and not included in the displayed rates.' },
  { icon: Box, title: 'Shipment Type', desc: 'Documents, parcels, and cargo each have different rate structures and weight limits.' },
];

const faqItems = [
  { q: 'How often are rates updated?', a: 'Our rates are updated regularly. The "last updated" date on each rate card shows when prices were last refreshed.' },
  { q: 'Do rates include customs duties?', a: 'No. Rates shown are shipping charges only. Customs duties, taxes, and destination charges are additional and vary by country.' },
  { q: 'What is the difference between Express and Economy?', a: 'Express delivers in 3-5 business days at a higher rate. Economy takes 7-12 days but costs less. Availability varies by destination.' },
  { q: 'How is the rate calculated for my weight?', a: 'Find your weight in the slab table. Weights are rounded up to the nearest 0.5 kg. The rate column shows the per-slab price.' },
  { q: 'Can I get a custom quote for large shipments?', a: 'Yes! For cargo or shipments over the standard weight slabs, please contact us for a customized quotation.' },
];

export default function RateCardsPage(): ReactNode {
  const config = useTenantConfig();
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serviceType, setServiceType] = useState<'all' | 'express' | 'economy' | 'ocean'>('all');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [countriesLoading, setCountriesLoading] = useState(true);

  const tenantSlug = config.slug;

  useEffect(() => {
    fetch(`${API_BASE}/api/check-price/countries?tenant=${tenantSlug}`)
      .then((r) => r.json())
      .then((body) => {
        if (body.data) setAvailableCountries(body.data);
      })
      .catch(() => {})
      .finally(() => setCountriesLoading(false));
  }, [tenantSlug]);

  const fetchPrice = useCallback(async (country: string) => {
    setLoading(true);
    setError('');
    setPriceData(null);
    try {
      const res = await fetch(`${API_BASE}/api/check-price/${encodeURIComponent(country)}?tenant=${tenantSlug}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Failed to fetch rates');
      setPriceData(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rates');
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  function handleSelectCountry(name: string) {
    setSelectedCountry(name);
    fetchPrice(name);
  }

  const sym: Record<string, string> = { INR: '₹', LKR: 'Rs', USD: '$' };
  const currencySymbol = sym[priceData?.currency ?? config.currency.code] ?? '';

  const availableServiceTypes = priceData
    ? [...new Set(priceData.rates.map((r) => r.serviceType))]
    : [];

  const validService = serviceType === 'all' || availableServiceTypes.includes(serviceType) ? serviceType : 'all';

  const filteredRates = priceData?.rates.filter((r) => {
    if (validService !== 'all' && r.serviceType !== validService) return false;
    return true;
  }) ?? [];

  const grouped: Record<string, ShippingRate[]> = {};
  for (const r of filteredRates) {
    if (!grouped[r.serviceType]) grouped[r.serviceType] = [];
    grouped[r.serviceType]!.push(r);
  }

  return (
    <PageShell>
      <PageHero
        image="/images/about.webp"
        eyebrow="Rate Cards"
        title={
          <>
            Shipping rates by
            <br />
            <span className="text-brand-accent">destination country</span>
          </>
        }
        subtitle="Select a destination to view per-kg courier charges across all service tiers — express, economy, and ocean freight."
      />

      <PageSection>
          <div className="max-w-5xl mx-auto space-y-14">

            <div>
              <p className="text-lg text-foreground/90 leading-relaxed mb-8">
                Transparent international courier charges with <strong>no hidden fees</strong>. Select your destination to see rates across available service tiers.
              </p>
              <div className="flex flex-wrap gap-3">
                {[
                  { icon: DollarSign, label: 'Per-kg pricing' },
                  { icon: Shield, label: 'No hidden charges' },
                  { icon: Truck, label: 'Doorstep pickup' },
                  { icon: Clock, label: 'Live rate updates' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 px-4 py-2 rounded-full bg-foreground/[0.04] border border-foreground/10 text-sm font-medium text-foreground/70">
                    <item.icon size={14} className="text-brand-accent" />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent mb-6">
                <span className="w-6 h-px bg-brand-accent" />
                Select Destination
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-2">
                Choose a <span className="text-brand-accent">destination country</span>
              </h2>
              <p className="text-lg text-foreground/85 mb-8">
                Only countries with active rate cards are shown. Can&apos;t find yours? Contact us for a custom quote.
              </p>

              <div className="premium-card p-6 md:p-8">
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="rate-country" className="text-sm font-semibold text-foreground/80">
                      Destination Country <span className="text-brand-accent">*</span>
                    </label>
                    <div className="relative">
                      <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30 pointer-events-none" />
                      <select
                        id="rate-country"
                        value={selectedCountry}
                        onChange={(e) => { setSelectedCountry(e.target.value); if (e.target.value) fetchPrice(e.target.value); }}
                        disabled={countriesLoading}
                        className="h-12 w-full pl-11 pr-10 rounded-xl bg-white outline-none transition-all border border-foreground/10 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 disabled:opacity-50 appearance-none cursor-pointer text-base text-foreground"
                      >
                        <option value="">{countriesLoading ? 'Loading countries...' : 'Select destination country'}</option>
                        {availableCountries.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/30 pointer-events-none" />
                    </div>
                  </div>

                  {loading && (
                    <div className="flex items-center justify-center py-8">
                      <span className="animate-spin rounded-full h-6 w-6 border-2 border-brand-accent border-t-transparent" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error && !loading && (
              <div className="rounded-2xl bg-brand-navy p-8 md:p-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-brand-accent/15 text-brand-accent flex items-center justify-center mx-auto mb-5">
                  <Globe size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Rates not available yet</h3>
                <p className="text-sm text-white/60 max-w-md mx-auto mb-6 leading-relaxed">
                  We don&apos;t have live rates for <strong className="text-white/80">{selectedCountry}</strong> at the moment. Our team can provide a custom quote.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <a href={config.contact.phoneHref} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-accent text-white text-sm font-semibold hover:bg-brand-accent-hover transition-colors">
                    <Phone size={14} />
                    {config.contact.phone}
                  </a>
                  <a href={`mailto:${config.contact.email}`} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors">
                    <Headphones size={14} />
                    Email Us
                  </a>
                </div>
              </div>
            )}

            {priceData && !loading && (
              <div>
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent mb-6">
                  <span className="w-6 h-px bg-brand-accent" />
                  Rate Card
                </span>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-2">
                  Shipping to <span className="text-brand-accent">{priceData.destinationCountry}</span>
                </h2>
                <p className="text-sm text-foreground/50 mb-6">Last updated: {new Date(priceData.updatedAt).toLocaleDateString()}</p>

                {availableServiceTypes.length > 1 && (
                  <div className="flex flex-col gap-1.5 mb-6">
                    <label className="text-sm font-semibold text-foreground/80">Service Type</label>
                    <div className="flex rounded-xl overflow-hidden h-12">
                      {[
                        { key: 'all', label: 'All' },
                        ...availableServiceTypes.map((s) => ({ key: s, label: SERVICE_META[s]?.label ?? s })),
                      ].map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => setServiceType(t.key as typeof serviceType)}
                          className={`flex-1 text-xs font-semibold uppercase tracking-wide transition-colors ${validService === t.key ? 'bg-brand-accent text-white' : 'bg-white text-foreground/50 hover:bg-foreground/[0.02]'}`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {filteredRates.length === 0 ? (
                  <div className="text-center py-16 premium-card">
                    <Package size={32} className="mx-auto text-foreground/15 mb-3" />
                    <p className="text-sm text-foreground/40">No rates available for shipments to {priceData.destinationCountry}.</p>
                  </div>
                ) : (
                  Object.entries(grouped).map(([svcType, slabs]) => {
                    const meta = SERVICE_META[svcType];
                    return (
                      <div key={svcType} className="mb-8 last:mb-0">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: meta?.color ?? '#6B7280' }}>
                            <Clock size={12} />
                            {meta?.tat ?? svcType}
                          </span>
                          <span className="text-base font-semibold text-foreground">{meta?.label ?? svcType}</span>
                        </div>
                        <div className="rounded-2xl overflow-hidden border border-border/50">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-foreground/[0.02]">
                                <th className="px-5 py-3 text-left text-xs font-semibold text-foreground/50 uppercase tracking-wider">Weight Slab (kg)</th>
                                <th className="px-5 py-3 text-right text-xs font-semibold text-foreground/50 uppercase tracking-wider">Rate ({priceData.currency})</th>
                              </tr>
                            </thead>
                            <tbody>
                              {slabs.map((s) => (
                                <tr key={s.id} className="border-t border-border/30">
                                  <td className="px-5 py-3.5 text-foreground/80">
                                    {s.weightFrom} – {s.weightTo}
                                  </td>
                                  <td className="px-5 py-3.5 text-right font-semibold text-foreground">{currencySymbol}{parseFloat(s.rate).toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })
                )}

                <div className="mt-6 p-4 bg-amber-50/80 border border-amber-200/50 rounded-xl flex items-start gap-3">
                  <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800/80 space-y-1">
                    <p>Rates shown are shipping charges only. Customs duties, taxes, and destination charges may apply.</p>
                    <p>Weights rounded up to nearest 0.5 kg. Final charges depend on actual weight at time of booking.</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent mb-6">
                <span className="w-6 h-px bg-brand-accent" />
                Pricing Factors
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-2">
                What affects <span className="text-brand-accent">courier charges?</span>
              </h2>
              <p className="text-lg text-foreground/85 mb-8">
                Several factors determine your international shipping cost.
              </p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {factors.map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                    className="premium-card p-6"
                  >
                    <div className="w-10 h-10 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center mb-3">
                      <f.icon size={20} />
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-1.5">{f.title}</h3>
                    <p className="text-sm text-foreground/60 leading-relaxed">{f.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl p-8 md:p-12 text-center">
              <div className="absolute inset-0 bg-brand-navy" />
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.08] text-white mb-3">
                  Ship Faster.{' '}
                  <span className="text-brand-accent">Ship Smarter.</span>
                </h2>
                <p className="text-base text-white/75 max-w-lg mx-auto mb-8">
                  Get an instant quote, find a branch, or schedule a pickup — whatever works for you.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <a href="/check-price" className="px-6 py-3 rounded-xl bg-white text-brand-accent text-base font-semibold hover:bg-white/90 transition-colors inline-flex items-center gap-2">
                    Check Price <ArrowRight size={16} />
                  </a>
                  <a href="/pickup" className="px-6 py-3 rounded-xl border border-white/20 text-white text-base font-semibold hover:bg-white/10 transition-colors inline-flex items-center gap-2">
                    Schedule Pickup
                  </a>
                </div>
              </div>
            </div>

            <div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent">
                <span className="h-px w-6 bg-brand-accent" />
                FAQ
                <span className="h-px w-6 bg-brand-accent" />
              </span>
              <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-8">
                Common <span className="text-brand-accent">questions.</span>
              </h2>

              <div className="space-y-3">
                {faqItems.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className="premium-card overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between px-6 py-4 text-left"
                    >
                      <span className="text-sm font-medium text-foreground pr-4">{item.q}</span>
                      <ChevronDown size={16} className={`text-foreground/30 transition-transform shrink-0 ${openFaq === i ? 'rotate-180' : ''}`} />
                    </button>
                    {openFaq === i && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="px-6 pb-4 text-sm text-foreground/60 leading-relaxed"
                      >
                        {item.a}
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 rounded-2xl bg-brand-accent/5 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center shrink-0">
                    <HelpCircle size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-1">Still have questions?</h3>
                    <p className="text-sm text-foreground/70 leading-relaxed mb-3">
                      Our support team is available Mon–Sat, 9 AM – 9 PM.
                    </p>
                    <a href={config.contact.phoneHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-accent hover:underline">
                      <Phone size={13} />
                      {config.contact.phone}
                    </a>
                  </div>
                </div>
              </div>
            </div>

          </div>
      </PageSection>
    </PageShell>
  );
}
