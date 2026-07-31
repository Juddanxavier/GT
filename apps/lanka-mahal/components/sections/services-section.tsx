'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, Calendar, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTenantConfig } from '@/lib/use-tenant-config';

const TABS = [
  { id: 'track', label: 'Track', icon: Search },
  { id: 'quote', label: 'Quote', icon: FileText },
  { id: 'pickup', label: 'Pickup', icon: Calendar },
];

export function ServicesSection(): ReactNode {
  const config = useTenantConfig();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('track');
  const [trackingNo, setTrackingNo] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [weight, setWeight] = useState('');

  function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingNo.trim()) return;
    router.push(`/track/${encodeURIComponent(trackingNo.trim())}`);
  }

  return (
    <section id="services" className="w-screen left-[calc(-50vw+50%)] relative bg-gradient-to-br from-[#fef2f0] via-white to-[#ffe8e4] overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-16 md:py-20">
        <div className="max-w-xl mb-10 mx-auto text-center">
          <span className="inline-flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-[#F59E0B] mb-4">
            <span className="w-6 h-px bg-[#F59E0B]" />
            Services
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-[1.15]">{config.services.title}</h2>
          <p className="mt-2 text-foreground/70">{config.services.subtitle}</p>
        </div>

        <div className="flex gap-2 mb-8 justify-center">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setActiveTab(tab.id); setTrackingNo(''); }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#F59E0B] text-white shadow-md'
                    : 'bg-white text-foreground/60 hover:bg-gray-50 border border-border shadow-sm'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex justify-center"
        >
          {activeTab === 'track' && (
            <form onSubmit={handleTrack} className="w-full max-w-xl rounded-2xl bg-white/90 backdrop-blur-xl border border-border p-6 shadow-lg">
              <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/60 mb-2">Tracking Number</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={trackingNo}
                  onChange={(e) => setTrackingNo(e.target.value)}
                  placeholder="e.g. GT-202407-001"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] bg-white placeholder:text-foreground/30"
                />
                <button
                  type="submit"
                  disabled={!trackingNo.trim()}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#F59E0B] hover:bg-[#D97706] transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  Track <ArrowRight size={14} />
                </button>
              </div>
            </form>
          )}

          {activeTab === 'quote' && (
            <form onSubmit={(e) => e.preventDefault()} className="w-full max-w-xl rounded-2xl bg-white/90 backdrop-blur-xl border border-border p-6 shadow-lg space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/60 mb-1.5">From</label>
                  <input type="text" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Origin" className="w-full px-3 py-2.5 rounded-xl border border-border text-foreground outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] bg-white placeholder:text-foreground/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/60 mb-1.5">To</label>
                  <input type="text" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Destination" className="w-full px-3 py-2.5 rounded-xl border border-border text-foreground outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] bg-white placeholder:text-foreground/30" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/60 mb-1.5">Weight</label>
                  <input type="text" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="kg" className="w-full px-3 py-2.5 rounded-xl border border-border text-foreground outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] bg-white placeholder:text-foreground/30" />
                </div>
              </div>
              <a href="/register" className="w-full px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#F59E0B] hover:bg-[#D97706] transition-colors flex items-center justify-center gap-1.5">
                Request Quote <ArrowRight size={14} />
              </a>
            </form>
          )}

          {activeTab === 'pickup' && (
            <div className="w-full max-w-xl rounded-2xl bg-white/90 backdrop-blur-xl border border-border p-6 shadow-lg flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center shrink-0">
                <Calendar size={18} className="text-[#F59E0B]" />
              </div>
              <div className="flex-1">
                <p className="text-base font-medium text-foreground">Free Door-to-Door Pickup</p>
                <p className="text-foreground/60 mt-0.5">Schedule online in under a minute.</p>
              </div>
              <a href="/pickup" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#F59E0B] hover:bg-[#D97706] transition-colors inline-flex items-center gap-1.5 shrink-0">
                Schedule <ArrowRight size={14} />
              </a>
            </div>
          )}
        </motion.div>
      </div>

    </section>
  );
}


