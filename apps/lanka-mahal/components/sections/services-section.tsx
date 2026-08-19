'use client';

import { MotionConfig, motion } from 'framer-motion';
import { ArrowRight, Calendar, Check, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTenantConfig } from '@/lib/use-tenant-config';

const TABS = [
  { id: 'track', label: 'Track', icon: Search },
  { id: 'pickup', label: 'Pickup', icon: Calendar },
];

const BENEFITS = [
  'Door-to-door pickup & delivery',
  'Real-time tracking to 200+ countries',
  'Customs clearance support',
];

export function ServicesSection(): ReactNode {
  const config = useTenantConfig();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('track');
  const [trackingNo, setTrackingNo] = useState('');

  function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingNo.trim()) return;
    router.push(`/track/${encodeURIComponent(trackingNo.trim())}`);
  }

  return (
    <section
      id="services"
      className="relative overflow-hidden bg-gradient-to-br from-[#fef2f0] via-white to-[#ffe8e4]"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-5 py-16 sm:px-8 md:px-16 md:py-24 lg:px-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#F59E0B] lg:justify-start">
              <span className="h-px w-6 bg-[#F59E0B]" />
              Quick Services
            </span>
            <h2 className="mt-4 text-2xl md:text-3xl font-bold tracking-tight leading-[1.15] text-foreground">
              {config.services.title}
            </h2>
            <p className="mt-3 text-base text-foreground/75">{config.services.subtitle}</p>

            <ul className="mx-auto mt-8 max-w-sm space-y-3 lg:mx-0 lg:max-w-none">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-[#F59E0B]/10">
                    <Check size={13} className="text-[#F59E0B]" />
                  </span>
                  <span className="text-foreground/80">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <MotionConfig reducedMotion="user">
            <div className="mx-auto w-full max-w-lg">
              <div className="rounded-sm border border-border bg-white p-5 sm:p-6">
                <div className="mb-6 flex gap-2">
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setTrackingNo('');
                        }}
                        className={`relative flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-sm text-sm font-medium transition-colors ${
                          isActive ? 'text-white' : 'text-foreground/60 hover:text-foreground'
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="services-tab-pill"
                            className="absolute inset-0 rounded-sm bg-[#F59E0B] "
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-1.5">
                          <Icon size={14} />
                          {tab.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {activeTab === 'track' && (
                    <form onSubmit={handleTrack}>
                      <label
                        htmlFor="services-tracking"
                        className="mb-2 block text-xs font-semibold uppercase tracking-wider text-foreground/60"
                      >
                        Tracking Number
                      </label>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <input
                          id="services-tracking"
                          type="text"
                          value={trackingNo}
                          onChange={(e) => setTrackingNo(e.target.value)}
                          placeholder="e.g. GT-202407-001"
                          className="h-12 w-full flex-1 rounded-sm border border-border bg-white px-4 text-foreground outline-none placeholder:text-foreground/30 focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20"
                        />
                        <button
                          type="submit"
                          disabled={!trackingNo.trim()}
                          className="flex h-12 w-full cursor-pointer items-center justify-center gap-1.5 rounded-sm bg-[#F59E0B] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#D97706] disabled:opacity-50 sm:w-auto"
                        >
                          Track <ArrowRight size={14} />
                        </button>
                      </div>
                    </form>
                  )}

                  {activeTab === 'pickup' && (
                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-[#F59E0B]/10">
                        <Calendar size={18} className="text-[#F59E0B]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-medium text-foreground">
                          Free Door-to-Door Pickup
                        </p>
                        <p className="mt-0.5 text-foreground/70">
                          Schedule online in under a minute.
                        </p>
                      </div>
                      <a
                        href="/pickup"
                        className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-sm bg-[#F59E0B] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#D97706] sm:w-auto"
                      >
                        Schedule <ArrowRight size={14} />
                      </a>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          </MotionConfig>
        </div>
      </div>
    </section>
  );
}
