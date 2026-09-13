'use client';

import { ChevronDown, Plus } from 'lucide-react';
import type { ReactNode } from 'react';

export interface FaqItem {
  q: string;
  a: string;
  category?: string;
}

interface FaqAccordionProps {
  items: readonly FaqItem[];
  openKeys: Record<string, boolean>;
  onToggle: (key: string) => void;
  keyPrefix?: string;
  variant?: 'cards' | 'list';
}

export function FaqAccordion({
  items,
  openKeys,
  onToggle,
  keyPrefix = '',
  variant = 'cards',
}: FaqAccordionProps): ReactNode {
  if (variant === 'list') {
    return (
      <div className="divide-y divide-border/70">
        {items.map((item, index) => {
          const key = `${keyPrefix}${item.category ? `${item.category}-` : ''}${item.q}`;
          const isOpen = openKeys[key];
          return (
            <div
              key={key}
              className={`transition-colors ${isOpen ? 'bg-brand-accent/[0.04]' : 'hover:bg-brand-cream/80'}`}
            >
              <button
                type="button"
                onClick={() => onToggle(key)}
                className="flex w-full cursor-pointer items-start gap-4 px-5 py-4 text-left md:px-6 md:py-5"
              >
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors ${
                    isOpen
                      ? 'bg-brand-accent text-white'
                      : 'bg-brand-navy/5 text-brand-navy/70'
                  }`}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-foreground md:text-base">{item.q}</span>
                </div>
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all ${
                    isOpen
                      ? 'rotate-45 border-brand-accent/30 bg-brand-accent/10 text-brand-accent'
                      : 'border-border bg-surface text-muted'
                  }`}
                >
                  <Plus size={14} />
                </span>
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <div className="overflow-hidden">
                  <p className="pb-5 pl-16 pr-6 text-sm leading-relaxed text-muted md:pl-[4.25rem] md:text-base">
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const key = `${keyPrefix}${item.category ? `${item.category}-` : ''}${item.q}`;
        const isOpen = openKeys[key];
        return (
          <div
            key={key}
            className={`premium-card overflow-hidden transition-shadow ${isOpen ? 'ring-1 ring-brand-accent/20' : ''}`}
          >
            <button
              type="button"
              onClick={() => onToggle(key)}
              className="flex w-full cursor-pointer items-start justify-between gap-4 p-5 text-left"
            >
              <div className="min-w-0">
                {item.category && (
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-brand-accent">
                    {item.category}
                  </span>
                )}
                <span className="text-base font-medium text-foreground md:text-lg">{item.q}</span>
              </div>
              <ChevronDown
                size={18}
                className={`mt-0.5 shrink-0 text-muted transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-accent' : ''}`}
              />
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-base leading-relaxed text-muted">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
