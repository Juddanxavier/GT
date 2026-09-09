'use client';

import { AlertCircle, Building2, MapPin, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Branch } from '@/lib/types';

interface BranchSelectProps {
  branches: Branch[];
  value: string;
  onChange: (branchId: string) => void;
  loading?: boolean;
  error?: string;
}

export function BranchSelect({
  branches,
  value,
  onChange,
  loading = false,
  error,
}: BranchSelectProps): ReactNode {
  const selected = branches.find((b) => b.id === value);
  const orphan = value && !selected && !loading;

  if (loading) {
    return (
      <div className="grid gap-2 sm:grid-cols-2" aria-busy="true">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-[88px] animate-pulse rounded-2xl border border-border/40 bg-foreground/[0.03]"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-foreground/[0.02] px-4 py-6 text-center text-sm text-foreground/50">
        No branches available right now. Please try again later.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orphan && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>Your saved branch could not be found. Please select your nearest branch below.</span>
        </div>
      )}

      <fieldset className="grid gap-2 border-0 p-0 sm:grid-cols-2">
        <legend className="sr-only">Nearest branch</legend>
        {branches.map((branch) => {
          const isSelected = value === branch.id;
          return (
            <label
              key={branch.id}
              className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                isSelected
                  ? 'border-brand-accent bg-brand-accent/5 shadow-[0_0_0_2px_rgba(232,98,26,0.15)]'
                  : 'border-border/60 bg-surface hover:border-brand-accent/30'
              }`}
            >
              <input
                type="radio"
                name="branch"
                value={branch.id}
                checked={isSelected}
                onChange={() => onChange(branch.id)}
                className="sr-only"
              />
              <div className="flex items-start gap-2.5">
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    isSelected ? 'bg-brand-accent text-white' : 'bg-brand-accent/10 text-brand-accent'
                  }`}
                >
                  <Building2 size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{branch.name}</p>
                  {branch.address && (
                    <p className="mt-1 flex items-start gap-1 text-xs leading-relaxed text-foreground/50">
                      <MapPin size={12} className="mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{branch.address}</span>
                    </p>
                  )}
                  {branch.phone && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-foreground/40">
                      <Phone size={12} />
                      {branch.phone}
                    </p>
                  )}
                </div>
              </div>
            </label>
          );
        })}
      </fieldset>
    </div>
  );
}
