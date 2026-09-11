'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Package, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PORTAL_SEARCH_ITEMS } from '@/lib/portal-paths';

type PortalGlobalSearchProps = {
  open: boolean;
  onClose: () => void;
};

export function PortalGlobalSearch({ open, onClose }: PortalGlobalSearchProps): ReactNode {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [trackingNo, setTrackingNo] = useState('');

  useEffect(() => {
    if (!open) {
      setQuery('');
      setTrackingNo('');
      return;
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PORTAL_SEARCH_ITEMS;
    return PORTAL_SEARCH_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.keywords.toLowerCase().includes(q),
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof results>();
    for (const item of results) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return map;
  }, [results]);

  const groupLabel: Record<string, string> = {
    shipments: 'Shipments',
    invoices: 'Invoices',
    help: 'Help',
    account: 'Account',
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close search"
            className="portal-ops-search-backdrop fixed inset-0 z-[80] bg-brand-navy/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Global search"
            className="portal-ops-search-sheet fixed inset-x-0 bottom-0 z-[90] mx-auto max-h-[min(88dvh,640px)] w-full max-w-lg rounded-t-2xl border border-white/10 bg-brand-navy shadow-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-sm font-semibold text-white">Search portal</p>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-white/50">
                  Track by number
                </label>
                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Package size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-accent" />
                    <input
                      ref={inputRef}
                      value={trackingNo}
                      onChange={(e) => setTrackingNo(e.target.value)}
                      placeholder="e.g. GT175001002"
                      className="h-11 w-full rounded-lg border border-white/10 bg-brand-navy-deep/80 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-brand-accent/50 focus:outline-none focus:ring-2 focus:ring-brand-accent/20"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && trackingNo.trim()) {
                          router.push(`/track/${encodeURIComponent(trackingNo.trim())}`);
                          onClose();
                        }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!trackingNo.trim()}
                    onClick={() => {
                      router.push(`/track/${encodeURIComponent(trackingNo.trim())}`);
                      onClose();
                    }}
                    className="inline-flex h-11 shrink-0 items-center gap-1 rounded-lg bg-brand-accent px-4 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    Track
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search pages, invoices, help…"
                  className="h-11 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-brand-accent/50 focus:outline-none focus:ring-2 focus:ring-brand-accent/20"
                />
              </div>

              <div className="space-y-4">
                {[...grouped.entries()].map(([group, items]) => (
                  <div key={group}>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                      {groupLabel[group] ?? group}
                    </p>
                    <div className="space-y-1">
                      {items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            router.push(item.href);
                            onClose();
                          }}
                          className="group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white/85 hover:bg-white/10"
                        >
                          {item.label}
                          <ArrowRight
                            size={14}
                            className="text-brand-accent opacity-0 transition-opacity group-hover:opacity-100"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {results.length === 0 && (
                  <p className="py-6 text-center text-sm text-white/50">No matches found</p>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
