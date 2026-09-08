'use client';

import { motion } from 'framer-motion';
import { COUNTRY_NAMES } from '@/lib/countries';
import { Button, Input, Label } from '@heroui/react';
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
import { useCallback, useState } from 'react';
import { PageHero } from '@/components/page/page-hero';
import { PageShell } from '@/components/page/page-section';
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

const strengths = [
  { icon: DollarSign, title: 'Transparent pricing', desc: 'No hidden fees. Clear rates with GST breakup upfront on every quote.', color: 'bg-violet-100 text-violet-600', iconBg: 'bg-violet-100 text-violet-600' },
  { icon: Truck, title: 'Doorstep pickup', desc: 'We collect from your home or office — no branch visit needed for most shipments.', color: 'bg-emerald-100 text-emerald-600', iconBg: 'bg-emerald-100 text-emerald-600' },
  { icon: Globe, title: 'Real-time tracking', desc: 'Track your shipment at every stage — from pickup to delivery with live updates.', color: 'bg-sky-100 text-sky-600', iconBg: 'bg-sky-100 text-sky-600' },
  { icon: Headphones, title: '24/7 support', desc: 'Our support team is available around the clock for booking and shipment assistance.', color: 'bg-amber-100 text-amber-600', iconBg: 'bg-amber-100 text-amber-600' },
];

const faqItems = [
  { q: 'How often are prices updated?', a: 'Our rates are updated regularly by our team. The "last updated" date on the rate table shows when prices were last refreshed.' },
  { q: 'Do prices include customs duties?', a: 'No. Rates shown are shipping charges only. Customs duties, taxes, and destination charges are additional and vary by country.' },
  { q: 'What is the difference between Express and Economy?', a: 'Express delivers in 3-5 business days at a higher rate. Economy takes 7-12 days but costs less. Availability varies by destination.' },
  { q: 'How is the rate calculated for my weight?', a: 'Enter your shipment weight to see the exact rate. We match it to the correct weight slab. Weights are rounded up to the nearest 0.5 kg.' },
  { q: 'Can I get a custom quote for large shipments?', a: 'Yes! For cargo or shipments over the standard weight slabs, please contact us for a customized quotation.' },
];

export default function CheckPricePage(): ReactNode {
  const config = useTenantConfig();
  const [selectedCountry, setSelectedCountry] = useState('');
  const [countryInput, setCountryInput] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [weight, setWeight] = useState('');
  const [serviceType, setServiceType] = useState<'all' | 'express' | 'economy'>('all');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  const countryErr = touched && !selectedCountry ? 'Select a destination country' : '';
  const weightNum = parseFloat(weight);
  const weightErr = touched && weight && (isNaN(weightNum) || weightNum < 1 || weightNum > 30) ? 'Weight must be 1–30 kg' : '';

  const allCountries = COUNTRY_NAMES;

  const fetchPrice = useCallback(async (country: string) => {
    setLoading(true);
    setError('');
    setPriceData(null);
    try {
      const res = await fetch(`${API_BASE}/api/check-price/${encodeURIComponent(country)}?tenant=${config.name === 'Lanka Mahal' ? 'lanka-mahal' : 'gajan-traders'}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Failed to fetch rates');
      setPriceData(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rates');
    } finally {
      setLoading(false);
    }
  }, [config.name]);

  function handleCheckPrice() {
    setTouched(true);
    if (!selectedCountry || countryErr || weightErr || cooldown) return;
    setCooldown(true);
    fetchPrice(selectedCountry);
    setTimeout(() => setCooldown(false), 3000);
  }

  const sym: Record<string, string> = { INR: '₹', LKR: 'Rs', USD: '$' };
  const currencySymbol = sym[priceData?.currency ?? config.currency.code] ?? '';

  const availableServiceTypes = priceData ? [...new Set(priceData.rates.map((r) => r.serviceType))] : [];

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

  const matchedRate = (slabs: ShippingRate[]) => {
    if (!weight || isNaN(weightNum) || weightNum <= 0) return null;
    const slab = slabs.find((s) => weightNum > parseFloat(s.weightFrom) && weightNum <= parseFloat(s.weightTo));
    if (!slab) {
      const last = slabs[slabs.length - 1];
      if (last && weightNum > parseFloat(last.weightTo)) return last;
    }
    return slab ?? null;
  };

  return (
    <PageShell>
      <PageHero
        image="/images/about.webp"
        eyebrow="Shipping Rates"
        title={
          <>
            International Courier
            <br />
            <span className="text-brand-accent">Service Rates</span>
          </>
        }
        subtitle="Get transparent courier charges for documents, parcels, and cargo to 200+ countries — with doorstep pickup, live tracking, and no hidden fees."
      />

      {/* Main Content */}
      <section className="relative bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-16 lg:px-24 py-16 md:py-24">
          <div className="max-w-5xl mx-auto space-y-14">

            {/* Intro */}
            <div>
              <p className="text-lg text-foreground/90 leading-relaxed mb-8">
                Transparent international courier charges with <strong>no hidden fees</strong>. Select your destination,
                shipment type, and weight to see live rates across available service tiers.
              </p>

              <div className="flex flex-wrap gap-3">
                {[
                  { icon: DollarSign, label: 'Per-kg pricing', bg: 'bg-violet-100 text-violet-700', iconCls: 'text-violet-500' },
                  { icon: Shield, label: 'No hidden charges', bg: 'bg-emerald-100 text-emerald-700', iconCls: 'text-emerald-500' },
                  { icon: Truck, label: 'Doorstep pickup', bg: 'bg-sky-100 text-sky-700', iconCls: 'text-sky-500' },
                  { icon: Clock, label: 'Live rate updates', bg: 'bg-amber-100 text-amber-700', iconCls: 'text-amber-500' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${item.bg}`}
                  >
                    <item.icon size={14} className={item.iconCls} />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Calculator */}
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent mb-6">
                <span className="w-6 h-px bg-brand-accent" />
                Shipping Calculator
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-2">
                Check rates for <span className="text-brand-accent">any destination</span>
              </h2>
              <p className="text-lg text-foreground/85 mb-8">
                Enter your destination, shipment type, and weight to see instant rates.
              </p>

              <div className="rounded-2xl bg-[#fafafa] p-6 md:p-8">
                <div className="space-y-4">
                  {/* Row 1: Destination */}
                  <div className="flex flex-col gap-1.5">
                    <Label>Destination Country <span className="text-brand-accent">*</span></Label>
                     <div className="relative">
                       <input
                         type="text"
                         placeholder="Search country..."
                         value={countryInput}
                          onChange={(e) => { setCountryInput(e.target.value); setSelectedCountry(''); }}
                         onFocus={() => setCountryOpen(true)}
                         onBlur={() => setTimeout(() => setCountryOpen(false), 150)}
                         className={`h-12 w-full px-4 rounded-xl bg-white outline-none transition-all ${countryErr ? 'border border-red-400 ring-2 ring-red-200' : 'border border-foreground/10 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20'}`}
                       />
                       {countryOpen && allCountries.filter((c) => c.toLowerCase().includes(countryInput.toLowerCase())).length > 0 && (
                         <div className="absolute z-50 mt-1 w-full rounded-xl border border-foreground/10 bg-white p-1 max-h-56 overflow-y-auto shadow-xl">
                           {allCountries.filter((c) => c.toLowerCase().includes(countryInput.toLowerCase())).slice(0, 50).map((name) => (
                             <button
                               key={name}
                               type="button"
                               onMouseDown={(e) => { e.preventDefault(); setCountryInput(name); setSelectedCountry(name); setCountryOpen(false); }}
                               className={`w-full px-4 py-2.5 text-sm text-left rounded-lg cursor-pointer transition-colors ${selectedCountry === name ? 'bg-brand-accent/10 text-brand-accent font-medium' : 'text-foreground/70 hover:bg-brand-accent/5'}`}
                             >
                               {name}
                             </button>
                           ))}
                         </div>
                       )}
                     </div>
                    {countryErr && <p className="text-xs text-red-500 mt-1">{countryErr}</p>}
                  </div>

                  {/* Row 3: Weight */}
                  <div className="flex flex-col gap-1.5">
                    <Label>Weight (kg)</Label>
                    <Input
                      type="number"
                      step={1}
                      min={1}
                      max={30}
                      placeholder="1 – 30 kg"
                      value={weight}
                      onChange={(e) => {
                        setTouched(true);
                        const v = e.target.value;
                        if (v === '' || (/^\d+$/.test(v) && parseInt(v) >= 1 && parseInt(v) <= 30)) setWeight(v);
                      }}
                      className={`h-12 rounded-xl ${weightErr ? 'border-red-400' : ''}`}
                    />
                    {weightErr && <p className="text-xs text-red-500 mt-1">{weightErr}</p>}
                  </div>

                  {/* Row 4: Button */}
                  <Button
                    type="button"
                    onPress={handleCheckPrice}
                    isDisabled={!selectedCountry || loading || cooldown}
                    className="w-full h-12 rounded-xl bg-brand-accent text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-brand-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <>Check Price <ArrowRight size={14} /></>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Results */}
            {error && (
              <div className="rounded-2xl bg-brand-navy p-8 md:p-10 text-center">
                <div className="w-14 h-14 rounded-2xl bg-brand-accent/15 text-brand-accent flex items-center justify-center mx-auto mb-5">
                  <Globe size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Rates not available yet</h3>
                <p className="text-sm text-white/60 max-w-md mx-auto mb-6 leading-relaxed">
                  We don't have live rates for <strong className="text-white/80">{selectedCountry}</strong> at the moment. Our team can provide a custom quote — reach out and we'll get back to you within the hour.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <a
                    href={config.contact.phoneHref}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-accent text-white text-sm font-semibold hover:bg-brand-accent-hover transition-colors"
                  >
                    <Phone size={14} />
                    {config.contact.phone}
                  </a>
                  <a
                    href={`mailto:${config.contact.email}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-colors"
                  >
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
                  Rates
                </span>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-2">
                  Shipping to <span className="text-brand-accent">{priceData.destinationCountry}</span>
                </h2>
                <p className="text-sm text-foreground/50 mb-8">Last updated: {new Date(priceData.updatedAt).toLocaleDateString()}</p>

                {filteredRates.length === 0 ? (
                  <div className="text-center py-16 rounded-2xl bg-[#fafafa]">
                    <Package size={32} className="mx-auto text-foreground/15 mb-3" />
                    <p className="text-sm text-foreground/40">No rates available for shipments to {priceData.destinationCountry}.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(grouped).map(([svcType, slabs]) => {
                      const meta = SERVICE_META[svcType];
                      const matched = matchedRate(slabs);
                      if (!matched) return null;
                      const rateNum = parseFloat(matched.rate);
                      const shipping = Math.ceil(rateNum * weightNum * 100) / 100;
                      const gst = Math.ceil(shipping * 0.18 * 100) / 100;
                      const total = Math.ceil((shipping + gst) * 100) / 100;
                      return (
                        <div key={svcType} className="rounded-2xl bg-[#fafafa] p-5 md:p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: meta?.color ?? '#6B7280' }}>
                              <Clock size={12} />
                              {meta?.tat ?? svcType}
                            </span>
                            <span className="text-base font-semibold text-foreground">{meta?.label ?? svcType}</span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                            <div>
                              <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-1">Weight Slab</p>
                              <p className="text-sm font-medium text-foreground">{matched.weightFrom} – {matched.weightTo} kg</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-1">Per Kg</p>
                              <p className="text-sm font-medium text-foreground">{currencySymbol}{rateNum.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-1">Shipping ({weightNum} kg)</p>
                              <p className="text-sm font-medium text-foreground">{currencySymbol}{shipping.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-1">GST 18%</p>
                              <p className="text-sm font-medium text-foreground/70">{currencySymbol}{gst.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-1">Total</p>
                              <p className="text-lg font-bold text-brand-accent">{currencySymbol}{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                            </div>
                          </div>
                          <div className="mt-4 flex justify-end">
                            <a
                              href={`/contact?service=${encodeURIComponent(meta?.label ?? svcType)}&country=${encodeURIComponent(priceData.destinationCountry)}&weight=${weightNum}`}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-accent text-white text-xs font-semibold hover:bg-brand-accent-hover transition-colors whitespace-nowrap"
                            >
                              Book Now
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-6 p-4 bg-amber-50/80 border border-amber-200/50 rounded-xl flex items-start gap-3">
                  <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <ul className="text-xs text-amber-800/80 space-y-1 list-disc list-inside">
                    <li>GST @ 18% as per Govt of India norms.</li>
                    <li>Medicine shipments capped at 1 kg or 3 months' supply, whichever is less.</li>
                    <li>Weight rounded up to nearest 0.5 kg below 20 kg, nearest 1 kg above 20 kg.</li>
                    <li>Final charges based on actual weight at time of tendering.</li>
                    <li>Customs duties and destination charges not included.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* What Factors Affect */}
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent mb-6">
                <span className="w-6 h-px bg-brand-accent" />
                Pricing Factors
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-2">
                What affects <span className="text-brand-accent">courier charges?</span>
              </h2>
              <p className="text-lg text-foreground/85 mb-8">
                Several factors determine your international shipping cost. Here's what to keep in mind.
              </p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {factors.map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                    className="rounded-2xl bg-[#fafafa] p-6"
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

            {/* Why Gajan Traders */}
            <div className="bg-surface/50 rounded-3xl p-8 md:p-10">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent mb-6">
                <span className="w-6 h-px bg-brand-accent" />
                Why {config.shortName}
              </span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-8">
                Why thousands choose us for <span className="text-brand-accent">express delivery</span>
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {strengths.map((s, i) => (
                  <motion.div
                    key={s.title}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className="rounded-2xl bg-white p-5"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.iconBg}`}>
                      <s.icon size={20} />
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-1.5">{s.title}</h3>
                    <p className="text-sm text-foreground/85 leading-relaxed">{s.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="relative overflow-hidden rounded-2xl p-8 md:p-12 text-center">
              <div className="absolute inset-0 bg-brand-navy" />
              <div className="cta-orb cta-orb-1" />
              <div className="cta-orb cta-orb-2" />
              <div className="cta-orb cta-orb-3" />
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.08] text-white mb-3">
                  Ship Faster.{' '}
                  <span className="text-brand-accent">Ship Smarter.</span>
                </h2>
                <p className="text-base text-white/75 max-w-lg mx-auto mb-8">
                  Get an instant quote, find a branch, or schedule a pickup — whatever works for you.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <a
                    href="/check-price"
                    className="px-6 py-3 rounded-xl bg-white text-brand-accent text-base font-semibold hover:bg-white/90 transition-colors inline-flex items-center gap-2"
                  >
                    Check Price <ArrowRight size={16} />
                  </a>
                  <a
                    href="/pickup"
                    className="px-6 py-3 rounded-xl border border-white/20 text-white text-base font-semibold hover:bg-white/10 transition-colors inline-flex items-center gap-2"
                  >
                    Schedule Pickup
                  </a>
                  <a
                    href="/branches"
                    className="px-6 py-3 rounded-xl border border-white/20 text-white text-base font-semibold hover:bg-white/10 transition-colors inline-flex items-center gap-2"
                  >
                    Find a Branch
                  </a>
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
            </div>

            {/* FAQ */}
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
                    className="rounded-2xl bg-[#fafafa] overflow-hidden"
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
                    <a
                      href={config.contact.phoneHref}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-accent hover:underline"
                    >
                      <Phone size={13} />
                      {config.contact.phone}
                    </a>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </PageShell>
  );
}
