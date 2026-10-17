'use client';

import { motion } from 'framer-motion';
import {
  Building2,
  FileText,
  HelpCircle,
  Info,
  MessageSquare,
  Package,
  RefreshCcw,
  Ruler,
  Scale,
  Weight,
} from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { PageHero } from '@/components/page/page-hero';
import { PageSection, PageShell } from '@/components/page/page-section';
import { FaqSection } from '@/components/sections/faq-section';
import { useTenantConfig } from '@/lib/use-tenant-config';

type Unit = 'metric' | 'imperial';

export default function VolumetricCalculatorPage(): ReactNode {
  const config = useTenantConfig();
  const [unit, setUnit] = useState<Unit>('metric');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [dimWeight, setDimWeight] = useState<number | null>(null);

  function calculate() {
    const l = parseFloat(length);
    const w = parseFloat(width);
    const h = parseFloat(height);
    if (!l || !w || !h) return;
    const divisor = unit === 'metric' ? 5000 : 166;
    const weight = (l * w * h) / divisor;
    setDimWeight(Math.round(weight * 100) / 100);
  }

  function clearAll() {
    setLength('');
    setWidth('');
    setHeight('');
    setDimWeight(null);
  }

  return (
    <PageShell>
      <PageHero
        image="/images/about.webp"
        eyebrow="Useful Tools"
        title="Volumetric Calculator"
        subtitle="Calculate dimensional weight for your shipments using IATA standards."
      />

      <PageSection>
          <div className="grid md:grid-cols-[1fr_280px] gap-8 md:gap-12">
            <div className="space-y-12">
              <div>
                <p className="text-lg text-foreground/90 leading-relaxed">
                  Calculate your shipment&apos;s <strong>volumetric (dimensional) weight</strong> in
                  seconds. Courier charges are based on the <strong>higher</strong> of the actual
                  weight and volumetric weight, ensuring the space your parcel occupies is taken
                  into account.
                </p>

                <Image
                  src="/images/volumehero.webp"
                  alt=""
                  width={1774}
                  height={887}
                  className="w-full rounded-2xl border border-border mb-8"
                />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    Dimensional weight <span className="text-brand-accent">calculator</span>
                  </h2>
                  <div className="flex rounded-xl border border-border p-0.5 bg-surface/50">
                    <button
                      type="button"
                      onClick={() => {
                        setUnit('metric');
                        clearAll();
                      }}
                      className={`min-h-11 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${unit === 'metric' ? 'bg-white text-foreground shadow-sm border border-border' : 'text-foreground/80 hover:text-foreground'}`}
                    >
                      CM / KG
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUnit('imperial');
                        clearAll();
                      }}
                      className={`min-h-11 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${unit === 'imperial' ? 'bg-white text-foreground shadow-sm border border-border' : 'text-foreground/80 hover:text-foreground'}`}
                    >
                      Inches / Lbs
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-surface/30 p-8">
                  <p className="text-base text-foreground/80 mb-5">
                    Volumetric Weight (kg) = (L &times; W &times; H) &divide;{' '}
                    {unit === 'metric' ? '5000' : '166'}
                  </p>
                  <div className="grid sm:grid-cols-3 gap-5 mb-6">
                    {[
                      {
                        label: 'Length',
                        value: length,
                        set: setLength,
                        unit: unit === 'metric' ? 'cm' : 'in',
                      },
                      {
                        label: 'Width',
                        value: width,
                        set: setWidth,
                        unit: unit === 'metric' ? 'cm' : 'in',
                      },
                      {
                        label: 'Height',
                        value: height,
                        set: setHeight,
                        unit: unit === 'metric' ? 'cm' : 'in',
                      },
                    ].map((f) => (
                      <div key={f.label}>
                        <label
                          htmlFor={`vol-${f.label}`}
                          className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-1.5 block"
                        >
                          {f.label} ({f.unit})
                        </label>
                        <input
                          id={`vol-${f.label}`}
                          value={f.value}
                          onChange={(e) => f.set(e.target.value)}
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          className="w-full px-4 py-3 rounded-xl border border-border text-lg text-foreground placeholder:text-foreground/80 outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={calculate}
                      className="px-6 py-3 rounded-full bg-brand-accent text-white text-base font-semibold hover:bg-brand-accent-hover transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Weight size={16} /> Calculate
                    </button>
                    <button
                      type="button"
                      onClick={clearAll}
                      className="px-5 py-3 rounded-xl border border-border text-foreground/85 text-base font-semibold hover:text-foreground hover:bg-surface/50 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <RefreshCcw size={16} /> Clear
                    </button>
                  </div>
                </div>

                {dimWeight !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-brand-accent/20 bg-brand-accent/5 p-8 mt-6"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-brand-accent/10 text-brand-accent flex items-center justify-center shrink-0">
                        <Weight size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-foreground/80 mb-0.5">
                          Dimensional Weight
                        </p>
                        <p className="text-4xl font-bold text-foreground tracking-tight">
                          {dimWeight}{' '}
                          <span className="text-xl font-semibold text-foreground/80">
                            {unit === 'metric' ? 'kg' : 'lbs'}
                          </span>
                        </p>
                        <p className="text-base text-foreground/80 mt-1">
                          ({length} &times; {width} &times; {height}) &divide;{' '}
                          {unit === 'metric' ? '5000' : '166'} = {dimWeight}{' '}
                          {unit === 'metric' ? 'kg' : 'lbs'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {dimWeight === null && (
                  <div className="rounded-2xl border border-border bg-surface/30 p-8 mt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-foreground/5 border border-border flex items-center justify-center shrink-0">
                        <Weight size={24} className="text-foreground/60" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-foreground/80 mb-0.5">
                          Dimensional Weight
                        </p>
                        <p className="text-xl font-medium text-foreground/80">
                          Enter dimensions to calculate
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-8">
                  <Image
                    src="/images/volume.webp"
                    alt="Volumetric weight illustration"
                    width={1677}
                    height={938}
                    className="w-full rounded-2xl border border-border"
                  />
                </div>
              </div>

              <div>
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent mb-6">
                  <span className="w-6 h-px bg-brand-accent" />
                  What is Volumetric Weight?
                </span>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
                  Volumetric weight <span className="text-brand-accent">explained</span>
                </h2>
                <p className="text-lg text-foreground/90 leading-relaxed">
                  Volumetric weight, also called <strong>Dimensional (DIM) Weight</strong>, is a
                  pricing method used by international courier companies. Large but lightweight
                  parcels occupy more cargo space, so shipping costs are calculated based on the
                  parcel&apos;s dimensions rather than just its physical weight.
                </p>
              </div>

              <div>
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent mb-6">
                  <span className="w-6 h-px bg-brand-accent" />
                  How to Calculate
                </span>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
                  How to calculate <span className="text-brand-accent">volumetric weight</span>
                </h2>
                <p className="text-lg text-foreground/90 leading-relaxed mb-6">
                  Measure your parcel in <strong>centimeters (cm)</strong>:
                </p>
                <div className="flex flex-wrap gap-4 mb-6">
                  {[
                    { icon: Ruler, label: 'Length (L)' },
                    { icon: Ruler, label: 'Width (W)' },
                    { icon: Ruler, label: 'Height (H)' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface/50 border border-border"
                    >
                      <item.icon size={18} className="text-brand-accent" />
                      <span className="text-base font-medium text-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl bg-surface/50 border border-border p-6 mb-6">
                  <p className="text-base font-semibold text-foreground mb-2">Formula:</p>
                  <p className="text-xl font-bold text-foreground bg-white px-4 py-3 rounded-xl border border-border font-mono">
                    Volumetric Weight (kg) = (Length &times; Width &times; Height) &divide; 5000
                  </p>
                </div>
                <div className="rounded-2xl bg-brand-accent/5 border border-brand-accent/20 p-6">
                  <p className="text-base font-semibold text-foreground mb-1">Example:</p>
                  <p className="text-lg text-brand-accent font-mono">
                    50 &times; 40 &times; 30 &divide; 5000 = <strong>12 kg</strong>
                  </p>
                  <p className="text-base text-foreground/70 mt-2">
                    If your parcel weighs <strong>10 kg</strong> but the volumetric weight is{' '}
                    <strong>12 kg</strong>, the chargeable weight will be <strong>12 kg</strong>.
                  </p>
                </div>
              </div>

              <div>
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent mb-6">
                  <span className="w-6 h-px bg-brand-accent" />
                  Chargeable Weight
                </span>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
                  Chargeable <span className="text-brand-accent">weight</span>
                </h2>
                <p className="text-lg text-foreground/90 leading-relaxed mb-6">
                  The <strong>Chargeable Weight</strong> is whichever is greater:
                </p>
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-brand-accent/5 border border-brand-accent/20">
                    <Scale size={18} className="text-brand-accent" />
                    <span className="text-base font-medium text-brand-accent">Actual Weight</span>
                   </div>
                   <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-brand-accent/5 border border-brand-accent/20">
                     <Package size={18} className="text-brand-accent" />
                     <span className="text-base font-medium text-brand-accent">Volumetric Weight</span>
                  </div>
                </div>
                <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
                  <table className="w-full text-base">
                    <thead>
                      <tr className="bg-surface-secondary/50 border-b border-border">
                        <th className="text-left px-5 py-4 text-sm font-bold text-foreground/80 uppercase tracking-wider">
                          Actual Weight
                        </th>
                        <th className="text-left px-5 py-4 text-sm font-bold text-foreground/80 uppercase tracking-wider">
                          Volumetric Weight
                        </th>
                        <th className="text-left px-5 py-4 text-sm font-bold text-foreground/80 uppercase tracking-wider">
                          Chargeable Weight
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { actual: '8 kg', volumetric: '10 kg', chargeable: '10 kg' },
                        { actual: '15 kg', volumetric: '12 kg', chargeable: '15 kg' },
                        { actual: '5 kg', volumetric: '5 kg', chargeable: '5 kg' },
                      ].map((row) => (
                        <tr
                          key={row.actual + row.chargeable}
                          className="border-b border-border last:border-b-0"
                        >
                          <td className="px-5 py-4 text-foreground/90">{row.actual}</td>
                          <td className="px-5 py-4 text-foreground/90">{row.volumetric}</td>
                          <td className="px-5 py-4 font-bold text-brand-accent">{row.chargeable}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent mb-6">
                  <span className="w-6 h-px bg-brand-accent" />
                  How to Measure
                </span>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
                  How to measure <span className="text-brand-accent">your parcel</span>
                </h2>
                <ol className="space-y-3">
                  {[
                    'Place the parcel on a flat surface.',
                    'Measure the longest side as the Length.',
                    'Measure the Width.',
                    'Measure the Height from the base to the highest point.',
                    'Round measurements up to the nearest centimeter for accuracy.',
                  ].map((step, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: ordered steps
                    <li key={i} className="flex gap-4 items-start">
                      <span className="w-7 h-7 rounded-full bg-brand-accent/10 text-brand-accent flex items-center justify-center shrink-0 text-sm font-bold">
                        {i + 1}
                      </span>
                      <span className="text-lg text-foreground/90 leading-relaxed pt-0.5">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent mb-6">
                  <span className="w-6 h-px bg-brand-accent" />
                  Why Volumetric Weight?
                </span>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
                  Why is volumetric <span className="text-brand-accent">weight used?</span>
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    'Fair pricing for oversized packages',
                    'Efficient cargo space utilization',
                    'Industry-standard pricing for air freight',
                    'Transparent shipping costs',
                    'Used by major international courier networks',
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 px-5 py-4 rounded-xl bg-surface/50 border border-border"
                    >
                      <div className="w-2 h-2 rounded-full bg-brand-accent shrink-0" />
                      <span className="text-base text-foreground/90">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-accent mb-6">
                  <span className="w-6 h-px bg-brand-accent" />
                  Tips
                </span>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
                  Tips before <span className="text-brand-accent">shipping</span>
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    'Pack items tightly to reduce unused space.',
                    'Use the smallest suitable carton.',
                    'Avoid oversized packaging for lightweight items.',
                    'Measure after the parcel is completely packed and sealed.',
                    'Double-check dimensions before booking your shipment.',
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 px-5 py-4 rounded-xl bg-surface/50 border border-border"
                    >
                      <Info size={18} className="text-brand-accent shrink-0 mt-0.5" />
                      <span className="text-base text-foreground/90">{item}</span>
                    </div>
                  ))}
                </div>
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
