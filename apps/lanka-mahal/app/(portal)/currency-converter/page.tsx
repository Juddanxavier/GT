'use client';

import {
  ArrowRightLeft,
  Building2,
  FileText,
  HelpCircle,
  MessageSquare,
  RefreshCcw,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { PageHero } from '@/components/page/page-hero';
import { PageSection, PageShell } from '@/components/page/page-section';
import { FaqSection } from '@/components/sections/faq-section';
import { useTenantConfig } from '@/lib/use-tenant-config';

const currencies = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'QAR', name: 'Qatari Riyal', flag: '🇶🇦' },
  { code: 'KWD', name: 'Kuwaiti Dinar', flag: '🇰🇼' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'LKR', name: 'Sri Lankan Rupee', flag: '🇱🇰' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'MYR', name: 'Malaysian Ringgit', flag: '🇲🇾' },
];

export default function CurrencyConverterPage(): ReactNode {
  const config = useTenantConfig();
  const [amount, setAmount] = useState('1');
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('INR');
  const [result, setResult] = useState<number | null>(null);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [error, setError] = useState('');

  const fetchRates = useCallback(async (base: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `https://latest.currency-api.pages.dev/v1/currencies/${base.toLowerCase()}.json`,
      );
      if (!res.ok) throw new Error('Failed to fetch rates');
      const data = await res.json();
      setRates(data[base.toLowerCase()]);
      setLastUpdated(data.date);
    } catch {
      setError('Could not fetch live rates. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates(from);
  }, [from, fetchRates]);

  useEffect(() => {
    const amt = parseFloat(amount);
    if (!amt || !rates[to]) {
      setResult(null);
      return;
    }
    setResult(Math.round(amt * rates[to] * 10000) / 10000);
  }, [amount, to, rates]);

  function swap() {
    setFrom(to);
    setTo(from);
  }

  const popularPairs = [
    { from: 'USD', to: 'INR' },
    { from: 'USD', to: 'AED' },
    { from: 'USD', to: 'SAR' },
    { from: 'USD', to: 'GBP' },
    { from: 'EUR', to: 'USD' },
    { from: 'INR', to: 'AED' },
    { from: 'GBP', to: 'INR' },
    { from: 'USD', to: 'LKR' },
  ];

  return (
    <PageShell>
      <PageHero
        image="/images/currencyhero.png"
        eyebrow="Useful Tools"
        title="Currency Converter"
        subtitle="Convert currencies using real-time exchange rates."
      />

      <PageSection>
          <div className="grid md:grid-cols-[1fr_280px] gap-8 md:gap-12">
            <div className="space-y-10">
              <div>
                <p className="text-lg text-foreground/90 leading-relaxed mb-8">
                  Convert between 15+ currencies using <strong>real-time exchange rates</strong>{' '}
                  powered by the European Central Bank.
                </p>

                <div className="rounded-2xl border border-border bg-surface/30 p-8">
                  <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-4 items-end">
                    <div>
                      <label
                        htmlFor="cc-amount"
                        className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-1.5 block"
                      >
                        Amount
                      </label>
                      <input
                        id="cc-amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Enter amount"
                        className="w-full px-4 py-3 rounded-xl border border-border text-lg text-foreground placeholder:text-foreground/80 outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="cc-from"
                        className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-1.5 block"
                      >
                        From
                      </label>
                      <select
                        id="cc-from"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border text-lg text-foreground outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all bg-white appearance-none cursor-pointer"
                      >
                        {currencies.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.code} — {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={swap}
                      className="flex items-center justify-center w-12 h-12 rounded-xl border border-border bg-white hover:bg-surface/50 transition-colors cursor-pointer self-end mx-auto"
                    >
                      <ArrowRightLeft size={18} className="text-foreground/80" />
                    </button>
                    <div>
                      <label
                        htmlFor="cc-to"
                        className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-1.5 block"
                      >
                        To
                      </label>
                      <select
                        id="cc-to"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border text-lg text-foreground outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all bg-white appearance-none cursor-pointer"
                      >
                        {currencies.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.code} — {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-foreground/80 mb-0.5">
                          Converted Amount
                        </p>
                        {loading ? (
                          <p className="text-2xl font-bold text-foreground/80 animate-pulse">
                            Loading...
                          </p>
                        ) : result !== null ? (
                          <p className="text-4xl font-bold text-foreground tracking-tight">
                            {result.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 4,
                            })}{' '}
                            <span className="text-xl font-semibold text-foreground/80">{to}</span>
                          </p>
                        ) : (
                          <p className="text-xl font-medium text-foreground/80">Enter an amount</p>
                        )}
                      </div>
                      {result !== null && rates[to] && (
                        <div className="text-right">
                          <p className="text-sm text-foreground/70">
                            1 {from} = {rates[to].toFixed(4)} {to}
                          </p>
                          <p className="text-sm text-foreground/70">
                            1 {to} = {(1 / rates[to]).toFixed(4)} {from}
                          </p>
                        </div>
                      )}
                    </div>
                    {lastUpdated && (
                      <p className="text-xs text-foreground/70 mt-3">
                        Rates updated: {lastUpdated}
                      </p>
                    )}
                    {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => fetchRates(from)}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl border border-border text-foreground/85 text-sm font-semibold hover:text-foreground hover:bg-surface/50 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCcw size={14} /> Refresh Rates
                  </button>
                  <span className="text-xs text-foreground/70">Powered by Currency API</span>
                </div>
              </div>

              <div>
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent mb-6">
                  <span className="w-6 h-px bg-brand-accent" />
                  Popular Pairs
                </span>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
                  Popular <span className="text-brand-accent">currency pairs</span>
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {popularPairs.map((pair) => {
                    const rate = rates[pair.to];
                    return (
                      <button
                        key={`${pair.from}-${pair.to}`}
                        type="button"
                        onClick={() => {
                          setFrom(pair.from);
                          setTo(pair.to);
                        }}
                        className="flex items-center justify-between px-5 py-4 rounded-xl border border-border bg-white hover:border-brand-accent/30 hover:shadow-sm transition-all cursor-pointer text-left"
                      >
                        <div>
                          <p className="text-base font-bold text-foreground">
                            {pair.from} → {pair.to}
                          </p>
                          {rate ? (
                            <p className="text-sm text-foreground/80 mt-0.5">
                              1 {pair.from} = {rate.toFixed(4)}
                            </p>
                          ) : (
                            <p className="text-sm text-foreground/60 mt-0.5">Loading...</p>
                          )}
                        </div>
                        <ArrowRightLeft size={14} className="text-foreground/60 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent mb-6">
                  <span className="w-6 h-px bg-brand-accent" />
                  All Rates
                </span>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
                  Exchange rates <span className="text-brand-accent">for {from}</span>
                </h2>
                {loading ? (
                  <div className="rounded-2xl border border-border p-8 text-center text-foreground/80 animate-pulse">
                    Loading rates...
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-base">
                        <thead>
                          <tr className="bg-surface-secondary/50 border-b border-border">
                            <th className="text-left px-5 py-4 text-sm font-bold text-foreground/80 uppercase tracking-wider">
                              Currency
                            </th>
                            <th className="text-right px-5 py-4 text-sm font-bold text-foreground/80 uppercase tracking-wider">
                              1 {from} =
                            </th>
                            <th className="text-right px-5 py-4 text-sm font-bold text-foreground/80 uppercase tracking-wider">
                              1 unit =
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {currencies
                            .filter((c) => c.code !== from)
                            .map((c, i) => (
                              <tr
                                key={c.code}
                                className={`border-b border-border last:border-b-0 hover:bg-surface/50 transition-colors cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-surface/20'}`}
                                onClick={() => setTo(c.code)}
                              >
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <span className="text-lg">{c.flag}</span>
                                    <span className="font-medium text-foreground">{c.code}</span>
                                    <span className="text-sm text-foreground/70">{c.name}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-right font-mono text-foreground/90">
                                  {rates[c.code]?.toFixed(6) ?? '-'}
                                </td>
                                <td className="px-5 py-4 text-right font-mono text-foreground/90">
                                  {c.code in rates
                                    ? (1 / (rates[c.code] ?? Number.NaN)).toFixed(6)
                                    : '-'}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-xl border border-border bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-3">
                  Quick Links
                </h3>
                <div className="space-y-2">
                  <a
                    href="/quote"
                    className="flex items-center gap-3 text-base text-foreground/85 hover:text-brand-accent transition-colors px-2 py-1.5 rounded-lg hover:bg-brand-accent/5"
                  >
                    <FileText size={16} className="shrink-0" /> Get a Quote
                  </a>
                  <a
                    href="/pickup"
                    className="flex items-center gap-3 text-base text-foreground/85 hover:text-brand-accent transition-colors px-2 py-1.5 rounded-lg hover:bg-brand-accent/5"
                  >
                    <FileText size={16} className="shrink-0" /> Schedule Pickup
                  </a>
                  <a
                    href="/contact"
                    className="flex items-center gap-3 text-base text-foreground/85 hover:text-brand-accent transition-colors px-2 py-1.5 rounded-lg hover:bg-brand-accent/5"
                  >
                    <MessageSquare size={16} className="shrink-0" /> Contact Support
                  </a>
                  <a
                    href="/branches"
                    className="flex items-center gap-3 text-base text-foreground/85 hover:text-brand-accent transition-colors px-2 py-1.5 rounded-lg hover:bg-brand-accent/5"
                  >
                    <Building2 size={16} className="shrink-0" /> Our Branches
                  </a>
                </div>
              </div>
              <div className="rounded-xl bg-brand-accent/5 border border-brand-accent/10 p-5">
                <div className="w-10 h-10 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center mb-3">
                  <HelpCircle size={18} />
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">Need help?</h3>
                <p className="text-sm text-foreground/80 leading-relaxed mb-3">
                  Our support team is available Mon–Sat, 9 AM – 9 PM.
                </p>
                <a
                  href={config.contact.phoneHref}
                  className="text-sm font-semibold text-brand-accent hover:underline"
                >
                  {config.contact.phone}
                </a>
              </div>
            </aside>
          </div>
      </PageSection>

      <FaqSection />
    </PageShell>
  );
}
