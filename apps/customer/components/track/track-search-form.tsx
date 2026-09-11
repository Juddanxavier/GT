'use client';

import { ArrowRight, Search } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';

type TrackSearchFormProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (trackingNo: string) => void;
  variant?: 'hero' | 'inline';
  tone?: 'light' | 'dark';
  placeholder?: string;
  className?: string;
};

export function TrackSearchForm({
  value,
  onChange,
  onSubmit,
  variant = 'hero',
  tone = 'light',
  placeholder = 'Enter tracking number',
  className = '',
}: TrackSearchFormProps): ReactNode {
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  if (variant === 'inline') {
    const inputCls =
      tone === 'dark'
        ? 'w-full rounded-2xl border border-white/15 bg-white/10 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/40 focus:border-brand-accent/50 focus:ring-2 focus:ring-brand-accent/25'
        : 'premium-input pl-10';

    return (
      <form onSubmit={handleSubmit} className={`flex flex-col gap-2 sm:flex-row ${className}`}>
        <div className="relative flex-1">
          <Search
            size={16}
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${tone === 'dark' ? 'text-white/40' : 'text-foreground/40'}`}
          />
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={inputCls}
          />
        </div>
        <button type="submit" className="premium-btn shrink-0 gap-2">
          Track <ArrowRight size={14} />
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col gap-3 sm:flex-row ${className}`}>
      <div className="relative flex-1">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-white/15 bg-white/10 py-4 pl-11 pr-4 text-base text-white backdrop-blur-md outline-none transition-all placeholder:text-white/45 focus:border-brand-accent/60 focus:ring-2 focus:ring-brand-accent/30"
        />
      </div>
      <button
        type="submit"
        className="inline-flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand-accent px-8 text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgba(232,98,26,0.55)] transition-all hover:bg-brand-accent-hover sm:min-w-[140px]"
      >
        Track parcel <ArrowRight size={16} />
      </button>
    </form>
  );
}
