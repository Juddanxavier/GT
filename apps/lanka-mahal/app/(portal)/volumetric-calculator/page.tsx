'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Ruler, Weight, RefreshCcw, FileText, MessageSquare, Building2, HelpCircle, Package, Maximize, Scale, Info } from 'lucide-react';
import { FaqSection } from '@/components/sections/faq-section';

type Unit = 'metric' | 'imperial';

export default function VolumetricCalculatorPage(): ReactNode {
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
    <div className="min-h-screen bg-white">
      <section className="w-screen left-[calc(-50vw+50%)] relative overflow-hidden min-h-[450px] md:min-h-[600px] flex items-center bg-[#1a1a2e]">
        <div className="absolute inset-0">
          <img src="/images/about.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e] via-[#1a1a2e]/70 to-transparent" />
        </div>
        <div className="relative z-10 px-8 md:px-16 lg:px-24 w-full">
          <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-3">
            <span className="w-6 h-px bg-[#F59E0B]" />
            Useful Tools
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">Volumetric Calculator</h1>
          <p className="text-lg text-white/90 max-w-lg mt-2">Calculate dimensional weight for your shipments using IATA standards.</p>
        </div>
      </section>

      <section className="w-screen left-[calc(-50vw+50%)] relative bg-white">
        <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-16 md:py-20">
          <div className="grid md:grid-cols-[1fr_280px] gap-8 md:gap-12">
            <div className="space-y-12">
              <div>
                <p className="text-lg text-foreground/90 leading-relaxed">
                  Calculate your shipment&apos;s <strong>volumetric (dimensional) weight</strong> in seconds. Courier charges are based on the <strong>higher</strong> of the actual weight and volumetric weight, ensuring the space your parcel occupies is taken into account.
                </p>

                <img src="/images/volumehero.png" alt="" className="w-full rounded-2xl border border-border mb-8" />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    Dimensional weight <span className="text-[#F59E0B]">calculator</span>
                  </h2>
                  <div className="flex rounded-xl border border-border p-0.5 bg-surface/50">
                    <button type="button" onClick={() => { setUnit('metric'); clearAll(); }} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${unit === 'metric' ? 'bg-white text-foreground shadow-sm border border-border' : 'text-foreground/80 hover:text-foreground'}`}>CM / KG</button>
                    <button type="button" onClick={() => { setUnit('imperial'); clearAll(); }} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${unit === 'imperial' ? 'bg-white text-foreground shadow-sm border border-border' : 'text-foreground/80 hover:text-foreground'}`}>Inches / Lbs</button>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-surface/30 p-8">
                  <p className="text-base text-foreground/80 mb-5">
                    Volumetric Weight (kg) = (L &times; W &times; H) &divide; {unit === 'metric' ? '5000' : '166'}
                  </p>
                  <div className="grid sm:grid-cols-3 gap-5 mb-6">
                    {[
                      { label: 'Length', value: length, set: setLength, unit: unit === 'metric' ? 'cm' : 'in' },
                      { label: 'Width', value: width, set: setWidth, unit: unit === 'metric' ? 'cm' : 'in' },
                      { label: 'Height', value: height, set: setHeight, unit: unit === 'metric' ? 'cm' : 'in' },
                    ].map((f) => (
                      <div key={f.label}>
                        <label className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-1.5 block">{f.label} ({f.unit})</label>
                        <input value={f.value} onChange={(e) => f.set(e.target.value)} type="number" min="0" step="any" placeholder="0" className="w-full px-4 py-3 rounded-xl border border-border text-lg text-foreground placeholder:text-foreground/80 outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] transition-all" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={calculate} className="px-6 py-3 rounded-xl bg-[#F59E0B] text-white text-base font-semibold hover:bg-[#D97706] transition-colors flex items-center gap-2 cursor-pointer">
                      <Weight size={16} /> Calculate
                    </button>
                    <button type="button" onClick={clearAll} className="px-5 py-3 rounded-xl border border-border text-foreground/85 text-base font-semibold hover:text-foreground hover:bg-surface/50 transition-colors flex items-center gap-2 cursor-pointer">
                      <RefreshCcw size={16} /> Clear
                    </button>
                  </div>
                </div>

                {dimWeight !== null && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-8 mt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center shrink-0">
                        <Weight size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-foreground/80 mb-0.5">Dimensional Weight</p>
                        <p className="text-4xl font-bold text-foreground tracking-tight">
                          {dimWeight} <span className="text-xl font-semibold text-foreground/80">{unit === 'metric' ? 'kg' : 'lbs'}</span>
                        </p>
                        <p className="text-base text-foreground/80 mt-1">
                          ({length} &times; {width} &times; {height}) &divide; {unit === 'metric' ? '5000' : '166'} = {dimWeight} {unit === 'metric' ? 'kg' : 'lbs'}
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
                        <p className="text-sm font-semibold uppercase tracking-wider text-foreground/80 mb-0.5">Dimensional Weight</p>
                        <p className="text-xl font-medium text-foreground/80">Enter dimensions to calculate</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-8">
                  <img src="/images/volume.png" alt="Volumetric weight illustration" className="w-full rounded-2xl border border-border" />
                </div>
              </div>

              <div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-4">
                  <span className="w-6 h-px bg-[#F59E0B]" />
                  What is Volumetric Weight?
                </span>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
                  Volumetric weight <span className="text-[#F59E0B]">explained</span>
                </h2>
                <p className="text-lg text-foreground/90 leading-relaxed">
                  Volumetric weight, also called <strong>Dimensional (DIM) Weight</strong>, is a pricing method used by international courier companies. Large but lightweight parcels occupy more cargo space, so shipping costs are calculated based on the parcel&apos;s dimensions rather than just its physical weight.
                </p>
              </div>

              <div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-4">
                  <span className="w-6 h-px bg-[#F59E0B]" />
                  How to Calculate
                </span>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
                  How to calculate <span className="text-[#F59E0B]">volumetric weight</span>
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
                    <div key={item.label} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface/50 border border-border">
                      <item.icon size={18} className="text-[#F59E0B]" />
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
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6">
                  <p className="text-base font-semibold text-amber-800 mb-1">Example:</p>
                  <p className="text-lg text-amber-700 font-mono">50 &times; 40 &times; 30 &divide; 5000 = <strong>12 kg</strong></p>
                  <p className="text-base text-amber-600/70 mt-2">
                    If your parcel weighs <strong>10 kg</strong> but the volumetric weight is <strong>12 kg</strong>, the chargeable weight will be <strong>12 kg</strong>.
                  </p>
                </div>
              </div>

              <div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-4">
                  <span className="w-6 h-px bg-[#F59E0B]" />
                  Chargeable Weight
                </span>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
                  Chargeable <span className="text-[#F59E0B]">weight</span>
                </h2>
                <p className="text-lg text-foreground/90 leading-relaxed mb-6">
                  The <strong>Chargeable Weight</strong> is whichever is greater:
                </p>
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20">
                    <Scale size={18} className="text-[#F59E0B]" />
                    <span className="text-base font-medium text-[#B45309]">Actual Weight</span>
                  </div>
                  <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20">
                    <Package size={18} className="text-[#F59E0B]" />
                    <span className="text-base font-medium text-[#B45309]">Volumetric Weight</span>
                  </div>
                </div>
                <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
                  <table className="w-full text-base">
                    <thead>
                      <tr className="bg-surface-secondary/50 border-b border-border">
                        <th className="text-left px-5 py-4 text-sm font-bold text-foreground/80 uppercase tracking-wider">Actual Weight</th>
                        <th className="text-left px-5 py-4 text-sm font-bold text-foreground/80 uppercase tracking-wider">Volumetric Weight</th>
                        <th className="text-left px-5 py-4 text-sm font-bold text-foreground/80 uppercase tracking-wider">Chargeable Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { actual: '8 kg', volumetric: '10 kg', chargeable: '10 kg' },
                        { actual: '15 kg', volumetric: '12 kg', chargeable: '15 kg' },
                        { actual: '5 kg', volumetric: '5 kg', chargeable: '5 kg' },
                      ].map((row, i) => (
                        <tr key={i} className="border-b border-border last:border-b-0">
                          <td className="px-5 py-4 text-foreground/90">{row.actual}</td>
                          <td className="px-5 py-4 text-foreground/90">{row.volumetric}</td>
                          <td className="px-5 py-4 font-bold text-[#F59E0B]">{row.chargeable}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-4">
                  <span className="w-6 h-px bg-[#F59E0B]" />
                  How to Measure
                </span>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
                  How to measure <span className="text-[#F59E0B]">your parcel</span>
                </h2>
                <ol className="space-y-3">
                  {[
                    'Place the parcel on a flat surface.',
                    'Measure the longest side as the Length.',
                    'Measure the Width.',
                    'Measure the Height from the base to the highest point.',
                    'Round measurements up to the nearest centimeter for accuracy.',
                  ].map((step, i) => (
                    <li key={i} className="flex gap-4 items-start">
                      <span className="w-7 h-7 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center shrink-0 text-sm font-bold">{i + 1}</span>
                      <span className="text-lg text-foreground/90 leading-relaxed pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-4">
                  <span className="w-6 h-px bg-[#F59E0B]" />
                  Why Volumetric Weight?
                </span>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
                  Why is volumetric <span className="text-[#F59E0B]">weight used?</span>
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    'Fair pricing for oversized packages',
                    'Efficient cargo space utilization',
                    'Industry-standard pricing for air freight',
                    'Transparent shipping costs',
                    'Used by major international courier networks',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-4 rounded-xl bg-surface/50 border border-border">
                      <div className="w-2 h-2 rounded-full bg-[#F59E0B] shrink-0" />
                      <span className="text-base text-foreground/90">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-4">
                  <span className="w-6 h-px bg-[#F59E0B]" />
                  Tips
                </span>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-[1.15] mb-4">
                  Tips before <span className="text-[#F59E0B]">shipping</span>
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    'Pack items tightly to reduce unused space.',
                    'Use the smallest suitable carton.',
                    'Avoid oversized packaging for lightweight items.',
                    'Measure after the parcel is completely packed and sealed.',
                    'Double-check dimensions before booking your shipment.',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 px-5 py-4 rounded-xl bg-surface/50 border border-border">
                      <Info size={18} className="text-[#F59E0B] shrink-0 mt-0.5" />
                      <span className="text-base text-foreground/90">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-xl border border-border bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-3">Quick Links</h3>
                <div className="space-y-2">
                  <a href="/quote" className="flex items-center gap-3 text-base text-foreground/85 hover:text-[#F59E0B] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#F59E0B]/5"><FileText size={16} className="shrink-0" /> Get a Quote</a>
                  <a href="/pickup" className="flex items-center gap-3 text-base text-foreground/85 hover:text-[#F59E0B] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#F59E0B]/5"><FileText size={16} className="shrink-0" /> Schedule Pickup</a>
                  <a href="/contact" className="flex items-center gap-3 text-base text-foreground/85 hover:text-[#F59E0B] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#F59E0B]/5"><MessageSquare size={16} className="shrink-0" /> Contact Support</a>
                  <a href="/branches" className="flex items-center gap-3 text-base text-foreground/85 hover:text-[#F59E0B] transition-colors px-2 py-1.5 rounded-lg hover:bg-[#F59E0B]/5"><Building2 size={16} className="shrink-0" /> Our Branches</a>
                </div>
              </div>
              <div className="rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/10 p-5">
                <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center mb-3"><HelpCircle size={18} /></div>
                <h3 className="text-base font-bold text-foreground mb-1">Need help?</h3>
                <p className="text-sm text-foreground/80 leading-relaxed mb-3">Our support team is available Mon–Sat, 9 AM – 9 PM.</p>
                <a href="tel:+919876543210" className="text-sm font-semibold text-[#F59E0B] hover:underline">+91 98765 43210</a>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <FaqSection />
    </div>
  );
}

