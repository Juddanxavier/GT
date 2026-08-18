'use client';

import type { ReactNode } from 'react';
import { useState, useMemo } from 'react';
import { Search, FileText, Calendar, Home, Package, ArrowRight, ArrowLeft, Ban } from 'lucide-react';
import { FaqSection } from '@/components/sections/faq-section';

const PACKAGE_TYPES = [
  { id: 'document', label: 'Document', icon: '📄' },
  { id: 'parcel', label: 'Parcel', icon: '📦' },
  { id: 'fragile', label: 'Fragile', icon: '🫙' },
  { id: 'bulk', label: 'Bulk', icon: '🗃️' },
];

const TIME_SLOTS = [
  { id: 'morning', label: '9 AM – 12 PM', sub: 'Morning' },
  { id: 'afternoon', label: '12 PM – 3 PM', sub: 'Afternoon' },
  { id: 'evening', label: '3 PM – 6 PM', sub: 'Evening' },
];

const PROHIBITED_ITEMS = [
  { icon: <svg viewBox="0 0 40 40" className="size-7"><defs><linearGradient id="cg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#f59e0b"/></linearGradient><filter id="csh1"><feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#00000030"/></filter></defs><rect x="6" y="10" width="28" height="18" rx="2" fill="url(#cg1)" filter="url(#csh1)"/><rect x="8" y="12" width="24" height="14" rx="1" fill="#fef3c7"/><text x="20" y="23" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#d97706">$</text></svg>, label: 'Currency', desc: 'Shipping of currency or cash is prohibited.', bg: 'from-amber-100 to-amber-50', border: 'border-amber-200' },
  { icon: <svg viewBox="0 0 40 40" className="size-7"><defs><linearGradient id="cg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#3b82f6"/><stop offset="100%" stopColor="#2563eb"/></linearGradient><filter id="csh2"><feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#00000030"/></filter></defs><circle cx="20" cy="20" r="12" fill="url(#cg2)" filter="url(#csh2)"/><text x="20" y="24" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white">!</text><circle cx="20" cy="14" r="1.5" fill="white"/></svg>, label: 'Hazardous', desc: 'Hazardous or dangerous goods are not allowed.', bg: 'from-blue-100 to-blue-50', border: 'border-blue-200' },
  { icon: <svg viewBox="0 0 40 40" className="size-7"><defs><linearGradient id="cg3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#8b5cf6"/></linearGradient><filter id="csh3"><feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#00000030"/></filter></defs><polygon points="20,8 26,18 24,18 28,26 12,26 16,18 14,18" fill="url(#cg3)" filter="url(#csh3)"/><polygon points="20,11 23,16 17,16" fill="white" opacity="0.3"/></svg>, label: 'Valuables', desc: 'Precious & Semi-Precious Items are not allowed.', bg: 'from-purple-100 to-purple-50', border: 'border-purple-200' },
  { icon: <svg viewBox="0 0 40 40" className="size-7"><defs><linearGradient id="cg4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f87171"/><stop offset="100%" stopColor="#ef4444"/></linearGradient><filter id="csh4"><feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#00000030"/></filter></defs><rect x="10" y="8" width="8" height="10" rx="1" fill="url(#cg4)" filter="url(#csh4)"/><rect x="22" y="14" width="8" height="10" rx="1" fill="url(#cg4)" filter="url(#csh4)"/><rect x="7" y="26" width="26" height="3" rx="1.5" fill="#dc2626"/></svg>, label: 'Legal', desc: 'Legally restricted items are not permitted.', bg: 'from-red-100 to-red-50', border: 'border-red-200' },
  { icon: <svg viewBox="0 0 40 40" className="size-7"><defs><linearGradient id="cg5" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fb923c"/><stop offset="100%" stopColor="#f97316"/></linearGradient><filter id="csh5"><feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#00000030"/></filter></defs><rect x="8" y="12" width="24" height="16" rx="2" fill="url(#cg5)" filter="url(#csh5)"/><rect x="14" y="8" width="12" height="6" rx="1" fill="#ea580c"/><line x1="16" y1="20" x2="24" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round"/><line x1="20" y1="16" x2="20" y2="24" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>, label: 'Shipment Risk', desc: 'Shipments posing risk or delay are not allowed.', bg: 'from-orange-100 to-orange-50', border: 'border-orange-200' },
  { icon: <svg viewBox="0 0 40 40" className="size-7"><defs><linearGradient id="cg6" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#22d3ee"/><stop offset="100%" stopColor="#06b6d4"/></linearGradient><filter id="csh6"><feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#00000030"/></filter></defs><path d="M14 30 L14 18 C14 14 16 10 20 10 C24 10 26 14 26 18 L26 30" fill="url(#cg6)" filter="url(#csh6)"/><rect x="12" y="18" width="16" height="12" rx="2" fill="#0891b2"/><text x="20" y="26" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">H₂O</text></svg>, label: 'Liquids', desc: 'Liquids and semi-liquids are prohibited.', bg: 'from-cyan-100 to-cyan-50', border: 'border-cyan-200' },
  { icon: <svg viewBox="0 0 40 40" className="size-7"><defs><linearGradient id="cg7" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#6b7280"/><stop offset="100%" stopColor="#4b5563"/></linearGradient><filter id="csh7"><feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#00000030"/></filter></defs><circle cx="20" cy="20" r="13" fill="url(#cg7)" filter="url(#csh7)"/><line x1="13" y1="13" x2="27" y2="27" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><line x1="27" y1="13" x2="13" y2="27" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>, label: 'Regulatory', desc: 'Goods banned by law may not be shipped.', bg: 'from-gray-100 to-gray-50', border: 'border-gray-200' },
  { icon: <svg viewBox="0 0 40 40" className="size-7"><defs><linearGradient id="cg8" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f87171"/><stop offset="50%" stopColor="#3b82f6"/><stop offset="100%" stopColor="#fbbf24"/></linearGradient><filter id="csh8"><feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#00000030"/></filter></defs><circle cx="20" cy="20" r="13" fill="url(#cg8)" filter="url(#csh8)"/><circle cx="14" cy="18" r="2" fill="white" opacity="0.6"/><circle cx="26" cy="18" r="2" fill="white" opacity="0.6"/><path d="M13 24 C15 27 25 27 27 24" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>, label: 'Perishable', desc: 'Perishable food and beverages are not allowed.', bg: 'from-rose-100 to-amber-50', border: 'border-rose-200' },
  { icon: <svg viewBox="0 0 40 40" className="size-7"><defs><linearGradient id="cg9" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#d97706"/></linearGradient><filter id="csh9"><feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#00000030"/></filter></defs><ellipse cx="20" cy="26" rx="10" ry="6" fill="url(#cg9)" filter="url(#csh9)"/><circle cx="14" cy="18" r="5" fill="#92400e"/><circle cx="26" cy="18" r="5" fill="#78350f"/><circle cx="14" cy="16" r="2" fill="white" opacity="0.2"/></svg>, label: 'Living', desc: 'Shipping of live animals or plants is prohibited.', bg: 'from-amber-100 to-yellow-50', border: 'border-amber-200' },
];

const SIDEBAR_LINKS = [
  { href: '/', label: 'Home', icon: <Home size={18} /> },
  { href: '/track', label: 'Track Shipment', icon: <Search size={18} /> },
  { href: '/pickup', label: 'Pickup Now', icon: <Calendar size={18} /> },
  { href: '/register', label: 'Get a Quote', icon: <FileText size={18} /> },
  { href: '/my-shipments', label: 'My Shipments', icon: <Package size={18} /> },
];

const STEP_LABELS = ['Address', 'Package', 'Schedule'];

export default function PickupPage(): ReactNode {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    address: '', landmark: '', pincode: '', city: '',
    packageType: '', weight: '', length: '', width: '', height: '', message: '',
    center: '', date: '', timeSlot: '',
    mathAnswer: '', terms: false,
  });
  const [mathA] = useState(() => Math.floor(Math.random() * 10) + 1);
  const [mathB] = useState(() => Math.floor(Math.random() * 10) + 1);
  const [submitted, setSubmitted] = useState(false);

  const mathResult = useMemo(() => mathA + mathB, [mathA, mathB]);

  const resetForm = () => {
    setForm({
      name: '', phone: '', email: '', address: '', landmark: '', pincode: '', city: '',
      packageType: '', weight: '', length: '', width: '', height: '', message: '',
      center: '', date: '', timeSlot: '', mathAnswer: '', terms: false,
    });
  };

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function canSubmit() {
    return (
      form.name.length >= 2 &&
      /^\d{9,10}$/.test(form.phone) &&
      form.email.includes('@') &&
      form.address &&
      form.landmark &&
      /^\d{5}$/.test(form.pincode) &&
      form.city &&
      form.packageType &&
      form.weight &&
      form.message &&
      form.center &&
      form.date &&
      form.timeSlot &&
      Number(form.mathAnswer) === mathResult &&
      form.terms
    );
  }

  return (
    <div className="min-h-screen bg-white relative -mt-14">
      <section className="relative overflow-hidden min-h-[420px] md:min-h-[520px] flex items-center bg-[#1a1a2e]">
        <div className="absolute inset-0">
          <img src="/images/about.png" alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e] via-[#1a1a2e]/70 to-transparent" />
        </div>
        <div className="relative z-10 px-8 md:px-16 lg:px-24 pt-24 md:pt-28 pb-16 w-full">
          <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-3">
            <span className="w-6 h-px bg-[#F59E0B]" />
            Schedule Pickup
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] text-white max-w-2xl">
            Book a door-to-door <span className="text-[#F59E0B]">pickup</span>
          </h1>
          <p className="text-lg text-white/90 max-w-lg mt-2">We&apos;ll pick up your shipment from your doorstep. Fast, reliable, and fully tracked.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl flex justify-center">
        <aside className="hidden lg:block w-56 shrink-0 border-r border-foreground/10 pt-28 px-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/40 px-4 mb-3">Menu</h3>
          <nav className="space-y-1">
            {SIDEBAR_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  link.href === '/pickup'
                    ? 'bg-[#F59E0B]/10 text-[#B45309]'
                    : 'text-foreground/60 hover:bg-foreground/[0.03] hover:text-foreground'
                }`}
              >
                {link.icon}
                {link.label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="flex-1 px-8 py-10 pt-28 max-w-2xl">
          {submitted ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-full bg-[#F59E0B]/10 flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Pickup Request Submitted!</h1>
              <p className="text-lg text-foreground/70 mt-3 leading-relaxed max-w-md mx-auto">
                Thank you, {form.name}. We&apos;ll pick up your {form.packageType} on <strong className="text-foreground">{form.date}</strong> between <strong className="text-foreground">{TIME_SLOTS.find((s) => s.id === form.timeSlot)?.label}</strong>. Our team will confirm shortly at <strong className="text-foreground">{form.phone}</strong>.
              </p>
              <button
                type="button"
                onClick={() => { setSubmitted(false); setStep(1); resetForm(); }}
                className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#F59E0B] text-white font-semibold hover:bg-[#D97706] transition-colors cursor-pointer"
              >
                Request another pickup
              </button>
            </div>
          ) : (
            <div className="rounded-3xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.05)] border border-foreground/5 p-6 sm:p-8">
              <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">Pickup Now</h1>
              <p className="text-foreground/60 mb-8">Schedule a free door-to-door pickup</p>

              <div className="flex items-center gap-2 mb-8">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                       step === s ? 'bg-[#F59E0B] text-white' : step > s ? 'bg-[#F59E0B]/10 text-[#B45309]' : 'bg-foreground/5 text-foreground/40'
                     }`}>
                      {step > s ? '✓' : s}
                    </div>
                    <span className={`text-sm font-medium ${step === s ? 'text-foreground' : 'text-foreground/40'}`}>{STEP_LABELS[s - 1]}</span>
                    {s < 3 && <div className={`w-8 h-px ${step > s ? 'bg-[#F59E0B]/40' : 'bg-foreground/10'}`} />}
                  </div>
                ))}
              </div>

              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FInput label="Full Name" required value={form.name} onChange={(v) => update('name', v)} placeholder="Min 2 characters" />
                    <FInput label="Phone Number" required type="tel" value={form.phone} onChange={(v) => update('phone', v.replace(/\D/g, '').slice(0, 10))} placeholder="9 or 10-digit mobile number" />
                  </div>
                  <FInput label="Email" required type="email" value={form.email} onChange={(v) => update('email', v)} placeholder="Your email address" />
                  <FInput label="Address Line 1" required value={form.address} onChange={(v) => update('address', v)} placeholder="Street, building, apartment" />
                  <FInput label="Area / Landmark" required value={form.landmark} onChange={(v) => update('landmark', v)} placeholder="Nearby landmark" />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FInput label="Postal Code" required value={form.pincode} onChange={(v) => update('pincode', v.replace(/\D/g, '').slice(0, 5))} placeholder="5-digit postal code" />
                    <FInput label="City" required value={form.city} onChange={(v) => update('city', v)} placeholder="Your city" />
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="button" onClick={() => setStep(2)} className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white bg-[#F59E0B] hover:bg-[#D97706] transition-colors cursor-pointer">
                      Next – Package Details <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-2">Package Type *</label>
                    <div className="grid grid-cols-4 gap-2">
                      {PACKAGE_TYPES.map((pt) => (
                        <button
                          key={pt.id}
                          type="button"
                          onClick={() => update('packageType', pt.id)}
                          className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-sm transition-all cursor-pointer ${
                            form.packageType === pt.id
                              ? 'border-[#F59E0B] bg-[#F59E0B]/10 text-[#B45309] font-medium'
                              : 'border-foreground/10 text-foreground/60 hover:border-foreground/20'
                          }`}
                        >
                          <span className="text-xl">{pt.icon}</span>
                          <span>{pt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <FInput label="Weight (kg)" required type="number" step="0.1" value={form.weight} onChange={(v) => update('weight', v)} placeholder="Package weight" />
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1.5">Dimensions L × W × H (cm) <span className="text-foreground/40 font-normal">- Optional</span></label>
                    <div className="grid grid-cols-3 gap-3">
                      <input type="number" placeholder="Length" value={form.length} onChange={(e) => update('length', e.target.value)} className="px-4 py-2.5 rounded-xl border border-foreground/15 text-base text-foreground outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] transition-all" />
                      <input type="number" placeholder="Width" value={form.width} onChange={(e) => update('width', e.target.value)} className="px-4 py-2.5 rounded-xl border border-foreground/15 text-base text-foreground outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] transition-all" />
                      <input type="number" placeholder="Height" value={form.height} onChange={(e) => update('height', e.target.value)} className="px-4 py-2.5 rounded-xl border border-foreground/15 text-base text-foreground outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1.5">Message *</label>
                    <textarea value={form.message} onChange={(e) => update('message', e.target.value)} placeholder="Special instructions or notes" rows={3} className="w-full px-4 py-2.5 rounded-xl border border-foreground/15 text-base text-foreground outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] transition-all resize-none" />
                  </div>
                  <div className="flex justify-between pt-2">
                    <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium text-foreground/70 border border-foreground/15 hover:bg-foreground/[0.03] transition-colors cursor-pointer"><ArrowLeft size={16} /> Back</button>
                    <button type="button" onClick={() => setStep(3)} className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white bg-[#F59E0B] hover:bg-[#D97706] transition-colors cursor-pointer">Next – Schedule <ArrowRight size={16} /></button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <form onSubmit={(e) => { e.preventDefault(); if (canSubmit()) setSubmitted(true); }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1.5">Pickup Center *</label>
                    <select value={form.center} onChange={(e) => update('center', e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-foreground/15 text-base text-foreground outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] transition-all">
                      <option value="">Choose a center</option>
                      <option value="colombo">Colombo</option>
                      <option value="kandy">Kandy</option>
                      <option value="jaffna">Jaffna</option>
                      <option value="galle">Galle</option>
                    </select>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground/70 mb-1.5">Pickup Date *</label>
                      <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-2.5 rounded-xl border border-foreground/15 text-base text-foreground outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground/70 mb-1.5">Time Slot *</label>
                      <div className="flex flex-col gap-1.5">
                        {TIME_SLOTS.map((slot) => (
                          <button key={slot.id} type="button" onClick={() => update('timeSlot', slot.id)}
                            className={`flex items-center justify-between px-4 py-2 rounded-xl border text-base transition-all cursor-pointer ${
                              form.timeSlot === slot.id
                                ? 'border-[#F59E0B] bg-[#F59E0B]/10 text-[#B45309] font-medium'
                                : 'border-foreground/10 text-foreground/60 hover:border-foreground/20'
                            }`}
                          >
                            <span>{slot.label}</span>
                            <span className="text-sm text-foreground/40">{slot.sub}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground/70 mb-1.5">Verification: What is {mathA} + {mathB}? *</label>
                    <input type="number" value={form.mathAnswer} onChange={(e) => update('mathAnswer', e.target.value)} placeholder="Solve the math" className="w-full px-4 py-2.5 rounded-xl border border-foreground/15 text-base text-foreground outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] transition-all" />
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.terms} onChange={(e) => update('terms', e.target.checked)} className="mt-0.5 rounded accent-[#F59E0B]" />
                    <span className="text-foreground/70">I agree to the <a href="#" className="text-[#D97706] underline">Terms &amp; Conditions</a></span>
                  </label>
                  <div className="flex justify-between pt-2">
                    <button type="button" onClick={() => setStep(2)} className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium text-foreground/70 border border-foreground/15 hover:bg-foreground/[0.03] transition-colors cursor-pointer"><ArrowLeft size={16} /> Back</button>
                    <button type="submit" disabled={!canSubmit()} className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 transition-colors cursor-pointer">Submit Pickup Request</button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        <aside className="hidden lg:block w-64 shrink-0 border-l border-foreground/10 pt-28 px-5">
          <div className="flex items-center gap-2 mb-5 px-1">
            <Ban size={14} className="text-[#F59E0B]" />
            <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/40">Prohibited Items</h3>
          </div>
          <div className="space-y-2.5">
            {PROHIBITED_ITEMS.map((item) => (
              <div key={item.label} className={`flex items-start gap-3 p-2.5 rounded-xl bg-gradient-to-br ${item.bg} border ${item.border} transition-all hover:shadow-md hover:-translate-y-0.5`}>
                <div className="mt-0.5 shrink-0">{item.icon}</div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground/80">{item.label}</p>
                  <p className="text-xs text-foreground/50 leading-snug mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
      <FaqSection />
    </div>
  );
}

function FInput({ label, required, type, step, value, onChange, placeholder }: {
  label: string; required?: boolean; type?: string; step?: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground/70 mb-1.5">{label}{required ? ' *' : ''}</label>
      <input
        type={type ?? 'text'}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl border border-foreground/15 text-base text-foreground placeholder:text-foreground/30 outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] transition-all"
      />
    </div>
  );
}
