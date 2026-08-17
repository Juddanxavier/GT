'use client';

import { useCallback, useState } from 'react';
import { Columns3 } from 'lucide-react';
import { Dropdown } from '@heroui/react';

export type Density = 'comfortable' | 'compact';

export interface ColumnDef {
  id: string;
  label: string;
  always?: boolean;
}

interface TablePreferencesProps {
  storageKey: string;
  columns: ColumnDef[];
  hidden: Set<string>;
  onHiddenChange: (next: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  density: Density;
  onDensityChange: (d: Density) => void;
}

export function TablePreferences({ storageKey: _storageKey, columns, hidden, onHiddenChange, density, onDensityChange }: TablePreferencesProps) {
  const toggle = useCallback(
    (id: string) => {
      onHiddenChange((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [onHiddenChange]
  );

  return (
    <Dropdown.Root>
      <Dropdown.Trigger className="inline-flex items-center justify-center gap-1.5 rounded-sm h-8 px-2.5 text-sm text-muted hover:text-foreground hover:bg-muted transition-colors outline-none" aria-label="Table options">
        <Columns3 size={15} />
        <span className="hidden sm:inline">View</span>
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end" className="w-64 p-3">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium mb-2">Density</p>
            <div className="flex rounded-sm border border-border overflow-hidden text-xs">
              {(['comfortable', 'compact'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onDensityChange(d)}
                  className={`flex-1 py-1.5 capitalize transition-colors ${density === d ? 'bg-accent text-[var(--accent-contrast)]' : 'hover:bg-muted'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium mb-2">Columns</p>
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {columns.map((col) => (
                <label key={col.id} className="flex items-center gap-2 py-1 text-sm cursor-pointer hover:bg-muted rounded-sm px-1">
                  <input
                    type="checkbox"
                    className="accent-[var(--accent)]"
                    checked={!hidden.has(col.id)}
                    disabled={col.always}
                    onChange={() => toggle(col.id)}
                  />
                  <span className={col.always ? 'text-muted' : undefined}>{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Dropdown.Popover>
    </Dropdown.Root>
  );
}

export function useTablePreferences(storageKey: string, columns: ColumnDef[]) {
  const [state, setState] = useState(() => {
    if (typeof window === 'undefined') return { hidden: new Set<string>(), density: 'comfortable' as Density };
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { hidden?: string[]; density?: Density };
        return { hidden: new Set(parsed.hidden ?? []), density: parsed.density ?? 'comfortable' };
      }
    } catch {
      // ignore corrupt storage
    }
    return { hidden: new Set<string>(), density: 'comfortable' as Density };
  });

  const setHidden = useCallback(
    (next: Set<string> | ((prev: Set<string>) => Set<string>)) => {
      setState((prev) => {
        const resolved = typeof next === 'function' ? next(prev.hidden) : next;
        const clean = new Set(columns.filter((c) => c.always).map((c) => c.id));
        for (const id of resolved) if (!clean.has(id)) clean.add(id);
        try {
          window.localStorage.setItem(storageKey, JSON.stringify({ hidden: [...clean], density: prev.density }));
        } catch {
          // storage unavailable
        }
        return { ...prev, hidden: clean };
      });
    },
    [storageKey, columns]
  );

  const setDensity = useCallback(
    (d: Density) => {
      setState((prev) => {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify({ hidden: [...prev.hidden], density: d }));
        } catch {
          // storage unavailable
        }
        return { ...prev, density: d };
      });
    },
    [storageKey]
  );

  const isVisible = useCallback((id: string) => !state.hidden.has(id), [state.hidden]);
  const reset = useCallback(() => {
    setHidden(new Set());
    setDensity('comfortable');
  }, [setHidden, setDensity]);

  return { ...state, setHidden, setDensity, isVisible, reset };
}

export function densityClassName(density: Density) {
  return density === 'compact' ? 'table-density-compact' : 'table-density-comfortable';
}
