'use client';

import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { PageHero } from '@/components/page/page-hero';
import { PageSection, PageShell } from '@/components/page/page-section';
import { PickupSidebar, PickupStepBar } from '@/components/pickup/pickup-sidebar';
import { RightSidebar } from '@/components/sidebar';
import { FaqSection } from '@/components/sections/faq-section';
import type { Branch } from '@/lib/types';
import { useTenantConfig } from '@/lib/use-tenant-config';

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

const INITIAL_FORM = {
  name: '',
  phone: '',
  email: '',
  address: '',
  landmark: '',
  pincode: '',
  city: '',
  packageType: '',
  weight: '',
  length: '',
  width: '',
  height: '',
  message: '',
  center: '',
  date: '',
  timeSlot: '',
  mathAnswer: '',
  terms: false,
};

export default function PickupPage(): ReactNode {
  const config = useTenantConfig();
  const [step, setStep] = useState(1);
  const [maxReachableStep, setMaxReachableStep] = useState(1);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [mathA] = useState(() => Math.floor(Math.random() * 10) + 1);
  const [mathB] = useState(() => Math.floor(Math.random() * 10) + 1);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch('/api/branches/public')
      .then((r) => r.json())
      .then((d) => setBranches(Array.isArray(d.data) ? d.data : []))
      .catch(() => {});
  }, []);

  const mathResult = useMemo(() => mathA + mathB, [mathA, mathB]);

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function canAdvanceFromStep1() {
    return (
      form.name.length >= 2 &&
      /^\d{10}$/.test(form.phone) &&
      form.email.includes('@') &&
      form.address &&
      form.landmark &&
      /^\d{6}$/.test(form.pincode) &&
      form.city
    );
  }

  function canAdvanceFromStep2() {
    return form.packageType && form.weight && form.message;
  }

  function canSubmit() {
    return (
      canAdvanceFromStep1() &&
      canAdvanceFromStep2() &&
      form.center &&
      form.date &&
      form.timeSlot &&
      Number(form.mathAnswer) === mathResult &&
      form.terms
    );
  }

  function goToStep(next: number) {
    setStep(next);
    setMaxReachableStep((prev) => Math.max(prev, next));
  }

  function resetForm() {
    setSubmitted(false);
    setStep(1);
    setMaxReachableStep(1);
    setForm(INITIAL_FORM);
  }

  return (
    <PageShell>
      <PageHero
        image="/images/heroparcel.png"
        eyebrow="Schedule Pickup"
        title={
          <>
            Book a door-to-door
            <br />
            <span className="text-brand-accent">pickup.</span>
          </>
        }
        subtitle={config.pickup.shortNotice}
      />

      <PageSection>
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10 xl:gap-12">
          <div className="order-2 lg:order-1 lg:col-span-3">
            <PickupSidebar
              step={step}
              maxReachableStep={maxReachableStep}
              onStepSelect={setStep}
            />
          </div>

          <div className="order-1 lg:order-2 lg:col-span-6">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="premium-card px-6 py-14 text-center md:px-12 md:py-16"
              >
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-accent/10 text-brand-accent">
                  <CheckCircle2 size={32} strokeWidth={1.75} />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  Pickup request submitted
                </h2>
                <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-foreground/65">
                  Thank you, {form.name}. We&apos;ve received your request for{' '}
                  <strong className="text-foreground">{form.date}</strong> between{' '}
                  <strong className="text-foreground">
                    {TIME_SLOTS.find((s) => s.id === form.timeSlot)?.label}
                  </strong>
                  . Our team will confirm availability within {config.pickup.radiusKm} km of your
                  selected office (conditions apply) at{' '}
                  <strong className="text-foreground">{form.phone}</strong>.
                </p>
                <button type="button" onClick={resetForm} className="premium-btn mt-8">
                  Request another pickup
                </button>
              </motion.div>
            ) : (
              <div className="premium-card p-6 md:p-8 lg:p-10">
                <span className="section-eyebrow mb-4">
                  <span className="section-eyebrow-line" />
                  Step {step} of 3
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  {step === 1 && (
                    <>
                      Where should we <span className="text-brand-accent">pick up?</span>
                    </>
                  )}
                  {step === 2 && (
                    <>
                      Tell us about your <span className="text-brand-accent">package.</span>
                    </>
                  )}
                  {step === 3 && (
                    <>
                      Choose date & <span className="text-brand-accent">time.</span>
                    </>
                  )}
                </h2>
                <p className="mt-2 text-sm text-foreground/60">{config.pickup.shortNotice}</p>

                <PickupStepBar step={step} />

                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mt-8"
                >
                  {step === 1 && (
                    <div className="space-y-5">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <FInput
                          label="Full Name"
                          required
                          value={form.name}
                          onChange={(v) => update('name', v)}
                          placeholder="Min 2 characters"
                        />
                        <FInput
                          label="Phone Number"
                          required
                          type="tel"
                          value={form.phone}
                          onChange={(v) => update('phone', v.replace(/\D/g, '').slice(0, 10))}
                          placeholder="10-digit mobile"
                        />
                      </div>
                      <FInput
                        label="Email"
                        required
                        type="email"
                        value={form.email}
                        onChange={(v) => update('email', v)}
                        placeholder="you@example.com"
                      />
                      <FInput
                        label="Address Line 1"
                        required
                        value={form.address}
                        onChange={(v) => update('address', v)}
                        placeholder="Street, building, apartment"
                      />
                      <FInput
                        label="Area / Landmark"
                        required
                        value={form.landmark}
                        onChange={(v) => update('landmark', v)}
                        placeholder="Nearby landmark"
                      />
                      <div className="grid gap-5 sm:grid-cols-2">
                        <FInput
                          label="Pincode"
                          required
                          value={form.pincode}
                          onChange={(v) => update('pincode', v.replace(/\D/g, '').slice(0, 6))}
                          placeholder="6-digit PIN"
                        />
                        <FInput
                          label="City"
                          required
                          value={form.city}
                          onChange={(v) => update('city', v)}
                          placeholder="Your city"
                        />
                      </div>
                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          disabled={!canAdvanceFromStep1()}
                          onClick={() => goToStep(2)}
                          className="premium-btn gap-2 disabled:opacity-50"
                        >
                          Next — Package <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-5">
                      <div>
                        <p className="mb-3 text-sm font-semibold text-foreground/80">Package type *</p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {PACKAGE_TYPES.map((pt) => (
                            <button
                              key={pt.id}
                              type="button"
                              onClick={() => update('packageType', pt.id)}
                              className={`flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-4 text-sm transition-all ${
                                form.packageType === pt.id
                                  ? 'border-brand-accent bg-brand-accent/5 font-semibold text-brand-accent'
                                  : 'border-border/60 text-foreground/70 hover:border-brand-accent/30'
                              }`}
                            >
                              <span className="text-2xl">{pt.icon}</span>
                              {pt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <FInput
                        label="Weight (kg)"
                        required
                        type="number"
                        step="0.1"
                        value={form.weight}
                        onChange={(v) => update('weight', v)}
                        placeholder="Package weight"
                      />
                      <div>
                        <label
                          htmlFor="dim-length"
                          className="mb-2 block text-sm font-semibold text-foreground/80"
                        >
                          Dimensions L × W × H (cm){' '}
                          <span className="font-normal text-foreground/45">— optional</span>
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          <input
                            id="dim-length"
                            type="number"
                            placeholder="L"
                            value={form.length}
                            onChange={(e) => update('length', e.target.value)}
                            className="premium-input"
                          />
                          <input
                            type="number"
                            placeholder="W"
                            value={form.width}
                            onChange={(e) => update('width', e.target.value)}
                            className="premium-input"
                          />
                          <input
                            type="number"
                            placeholder="H"
                            value={form.height}
                            onChange={(e) => update('height', e.target.value)}
                            className="premium-input"
                          />
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor="pickup-message"
                          className="mb-2 block text-sm font-semibold text-foreground/80"
                        >
                          Message *
                        </label>
                        <textarea
                          id="pickup-message"
                          value={form.message}
                          onChange={(e) => update('message', e.target.value)}
                          placeholder="Special instructions or notes"
                          rows={3}
                          className="premium-input resize-none"
                        />
                      </div>
                      <div className="flex justify-between gap-3 pt-2">
                        <button type="button" onClick={() => setStep(1)} className="premium-btn-ghost">
                          Back
                        </button>
                        <button
                          type="button"
                          disabled={!canAdvanceFromStep2()}
                          onClick={() => goToStep(3)}
                          className="premium-btn gap-2 disabled:opacity-50"
                        >
                          Next — Schedule <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (canSubmit()) setSubmitted(true);
                      }}
                      className="space-y-5"
                    >
                      <div>
                        <label
                          htmlFor="pickup-center"
                          className="mb-2 block text-sm font-semibold text-foreground/80"
                        >
                          Pickup center *
                        </label>
                        <select
                          id="pickup-center"
                          value={form.center}
                          onChange={(e) => update('center', e.target.value)}
                          className="premium-input"
                        >
                          <option value="">Choose nearest office</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                        <p className="mt-2 text-xs leading-relaxed text-foreground/55">
                          Pickup is only available within {config.pickup.radiusKm} km of the selected
                          office. Conditions apply — we confirm after you submit.
                        </p>
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="pickup-date"
                            className="mb-2 block text-sm font-semibold text-foreground/80"
                          >
                            Pickup date *
                          </label>
                          <input
                            id="pickup-date"
                            type="date"
                            value={form.date}
                            onChange={(e) => update('date', e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="premium-input"
                          />
                        </div>
                        <div>
                          <p className="mb-2 text-sm font-semibold text-foreground/80">Time slot *</p>
                          <div className="flex flex-col gap-2">
                            {TIME_SLOTS.map((slot) => (
                              <button
                                key={slot.id}
                                type="button"
                                onClick={() => update('timeSlot', slot.id)}
                                className={`flex items-center justify-between rounded-2xl border px-4 py-2.5 text-sm transition-all ${
                                  form.timeSlot === slot.id
                                    ? 'border-brand-accent bg-brand-accent/5 font-semibold text-brand-accent'
                                    : 'border-border/60 text-foreground/70 hover:border-brand-accent/30'
                                }`}
                              >
                                <span>{slot.label}</span>
                                <span className="text-xs text-foreground/45">{slot.sub}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor="pickup-math"
                          className="mb-2 block text-sm font-semibold text-foreground/80"
                        >
                          Verification: What is {mathA} + {mathB}? *
                        </label>
                        <input
                          id="pickup-math"
                          type="number"
                          value={form.mathAnswer}
                          onChange={(e) => update('mathAnswer', e.target.value)}
                          placeholder="Your answer"
                          className="premium-input"
                        />
                      </div>
                      <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-foreground/[0.03] p-4">
                        <input
                          type="checkbox"
                          checked={form.terms}
                          onChange={(e) => update('terms', e.target.checked)}
                          className="mt-0.5 rounded border-border text-brand-accent focus:ring-brand-accent"
                        />
                        <span className="text-sm leading-relaxed text-foreground/70">
                          I confirm my address is within {config.pickup.radiusKm} km of the selected
                          office, understand that conditions apply, and agree to the{' '}
                          <a href="/terms-conditions" className="font-semibold text-brand-accent hover:underline">
                            Terms & Conditions
                          </a>
                          .
                        </span>
                      </label>
                      <div className="flex justify-between gap-3 pt-2">
                        <button type="button" onClick={() => setStep(2)} className="premium-btn-ghost">
                          Back
                        </button>
                        <button type="submit" disabled={!canSubmit()} className="premium-btn disabled:opacity-50">
                          Submit pickup request
                        </button>
                      </div>
                    </form>
                  )}
                </motion.div>
              </div>
            )}
          </div>

          <div className="order-3 lg:col-span-3">
            <RightSidebar alwaysShow />
          </div>
        </div>
      </PageSection>

      <FaqSection />
    </PageShell>
  );
}

function FInput({
  label,
  required,
  type,
  step,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  required?: boolean;
  type?: string;
  step?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const fieldId = `pickup-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  return (
    <div>
      <label htmlFor={fieldId} className="mb-2 block text-sm font-semibold text-foreground/80">
        {label}
        {required ? ' *' : ''}
      </label>
      <input
        id={fieldId}
        type={type ?? 'text'}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="premium-input"
      />
    </div>
  );
}
