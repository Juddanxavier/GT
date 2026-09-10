'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Kbd } from '@heroui/react';
import { SearchField } from '@heroui/react/search-field';
import { Modal } from '@heroui/react/modal';
import {
  Search, Package, Users, Receipt, ArrowRight,
  LayoutDashboard, Building2, BarChart3,
  Plus, User, ArrowUp, ArrowDown, CornerDownLeft,
} from 'lucide-react';
import { api } from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────────────────

interface SearchResults {
  shipments: { id: string; trackingNo: string; status: string; carrier: string | null }[];
  customers: { id: string; name: string; email: string | null }[];
  invoices: { id: string; invoiceNo: string; amount: string; status: string }[];
}

type ResultType = 'shipment' | 'customer' | 'invoice';

interface FlatResult {
  type: ResultType;
  id: string;
  label: string;
  subtitle: string;
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

// ─── Static data ───────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { id: 'shipments', label: 'Shipments', href: '/shipments', icon: Package },
  { id: 'customers', label: 'Customers', href: '/customers', icon: Users },
  { id: 'invoices', label: 'Invoices', href: '/invoices', icon: Receipt },
  { id: 'branches', label: 'Branches', href: '/branches', icon: Building2 },
  { id: 'reports', label: 'Reports', href: '/reports', icon: BarChart3 },
];

const QUICK_ACTIONS: NavItem[] = [
  { id: 'new-shipment', label: 'Create Shipment', href: '/shipments', icon: Plus },
  { id: 'profile', label: 'Go to Profile', href: '/profile', icon: User },
];

const ICONS: Record<ResultType, typeof Package> = { shipment: Package, customer: Users, invoice: Receipt };

// ─── Component ─────────────────────────────────────────────────────────

export function SearchDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allItems = useMemo(() => {
    const items: { kind: 'nav'; icon: typeof LayoutDashboard; label: string; href: string; id: string }[] = [];
    if (!query.trim()) {
      NAV_ITEMS.forEach((n) => items.push({ ...n, kind: 'nav' }));
      QUICK_ACTIONS.forEach((a) => items.push({ ...a, kind: 'nav' }));
    }
    return items;
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults(null);
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults(null); return; }
    setLoading(true);
    setSelectedIndex(-1);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.get<SearchResults>(`/api/search?q=${encodeURIComponent(query)}`);
        setResults(data);
      } catch { setResults(null); }
      setLoading(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const flatResults: FlatResult[] = [];
  if (results) {
    results.shipments.forEach((r) => flatResults.push({ type: 'shipment', id: r.id, label: r.trackingNo, subtitle: r.carrier ?? r.status }));
    results.customers.forEach((r) => flatResults.push({ type: 'customer', id: r.id, label: r.name, subtitle: r.email ?? '' }));
    results.invoices.forEach((r) => flatResults.push({ type: 'invoice', id: r.id, label: r.invoiceNo, subtitle: `${r.amount} · ${r.status}` }));
  }

  const totalSelectable = query.trim() ? flatResults.length : allItems.length;

  const navigate = useCallback((item: { kind?: string; type?: string; href?: string; id: string }) => {
    if (item.kind === 'nav' && item.href) {
      router.push(item.href);
    } else if (item.type) {
      const t = item.type as ResultType;
      router.push(`/${t === 'shipment' ? 'shipments' : t === 'customer' ? 'customers' : 'invoices'}/${item.id}`);
    }
    onClose();
  }, [router, onClose]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((p) => (p + 1) % Math.max(totalSelectable, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((p) => (p - 1 + Math.max(totalSelectable, 1)) % Math.max(totalSelectable, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!query.trim()) {
        const item = allItems[selectedIndex];
        if (item) navigate(item);
      } else if (selectedIndex >= 0 && flatResults[selectedIndex]) {
        navigate(flatResults[selectedIndex]);
      } else {
        router.push(`/search?q=${encodeURIComponent(query)}`);
        onClose();
      }
    }
  }

  const grouped = useMemo(() => {
    if (!results) return [];
    const groups: { title: string; items: FlatResult[] }[] = [];
    if (results.shipments.length) groups.push({ title: 'Shipments', items: flatResults.slice(0, results.shipments.length) });
    if (results.customers.length) groups.push({ title: 'Customers', items: flatResults.slice(results.shipments.length, results.shipments.length + results.customers.length) });
    if (results.invoices.length) groups.push({ title: 'Invoices', items: flatResults.slice(results.shipments.length + results.customers.length) });
    return groups;
  }, [results, flatResults]);

  const showingEmpty = !query.trim();
  const showingResults = !!results && !loading && !!query.trim();
  const showingNoResults = !loading && results && flatResults.length === 0 && !!query.trim();
  const showingLoading = loading && !!query.trim();

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Container>
        <Modal.Dialog className="max-w-2xl glass-panel border-glass">
          <div className="px-5 pt-5 pb-3">
            <SearchField value={query} onChange={setQuery} autoFocus aria-label="Search">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Search or navigate..." onKeyDown={handleKeyDown} />
                <SearchField.ClearButton />
                <Kbd className="hidden sm:inline-flex ml-auto">
                  <Kbd.Abbr keyValue="command" />
                  <Kbd.Content>K</Kbd.Content>
                </Kbd>
              </SearchField.Group>
            </SearchField>
          </div>

          <Modal.Body className="p-0 max-h-[min(480px,60vh)] overflow-y-auto border-t border-border">
            {showingEmpty && (
              <div className="pb-2">
                <div className="px-5 py-2.5 text-[11px] font-semibold text-muted uppercase tracking-widest">Navigate</div>
                <div className="px-2">
                  {NAV_ITEMS.map((item, i) => (
                    <button
                      key={item.id}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sm
                        ${selectedIndex === i ? 'bg-accent/10 text-accent' : 'hover:bg-muted/10 text-foreground'}`}
                      onClick={() => navigate({ ...item, kind: 'nav' })}
                      onMouseEnter={() => setSelectedIndex(i)}
                    >
                      <item.icon size={16} className="shrink-0 text-muted" />
                      <span className="flex-1 truncate">{item.label}</span>
                      <span className="text-[11px] text-muted/50 font-mono hidden sm:inline">
                        {item.id === 'dashboard' ? '⌘1' : item.id === 'shipments' ? '⌘2' : item.id === 'customers' ? '⌘3' : ''}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-1 px-5 py-2.5 text-[11px] font-semibold text-muted uppercase tracking-widest">Quick Actions</div>
                <div className="px-2">
                  {QUICK_ACTIONS.map((item) => {
                    const idx = NAV_ITEMS.length + QUICK_ACTIONS.indexOf(item);
                    return (
                      <button
                        key={item.id}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sm
                          ${selectedIndex === idx ? 'bg-accent/10 text-accent' : 'hover:bg-muted/10 text-foreground'}`}
                        onClick={() => navigate({ ...item, kind: 'nav' })}
                        onMouseEnter={() => setSelectedIndex(idx)}
                      >
                        <item.icon size={16} className="shrink-0 text-muted" />
                        <span className="flex-1 truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {showingLoading && (
              <div className="flex items-center justify-center gap-2 py-8">
                <span className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                <span className="text-sm text-muted">Searching...</span>
              </div>
            )}

            {showingNoResults && (
              <div className="py-12 text-center">
                <Search size={28} className="mx-auto text-muted/40 mb-3" />
                <p className="text-sm text-muted">No results found</p>
                <button
                  className="mt-3 text-xs text-accent hover:text-accent/80 transition-colors"
                  onClick={() => { router.push(`/search?q=${encodeURIComponent(query)}`); onClose(); }}
                >
                  Search all fields on full page &rarr;
                </button>
              </div>
            )}

            {showingResults && (
              <div className="pb-3">
                {grouped.map((group) => (
                  <div key={group.title}>
                    <div className="px-5 py-2.5 text-[11px] font-semibold text-muted uppercase tracking-widest">
                      {group.title}
                      <span className="ml-2 text-muted/40 font-normal normal-case">{group.items.length}</span>
                    </div>
                    <div className="px-2">
                      {group.items.map((item) => {
                        const globalIdx = flatResults.indexOf(item);
                        const Icon = ICONS[item.type];
                        return (
                          <button
                            key={`${item.type}-${item.id}`}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sm
                              ${selectedIndex === globalIdx ? 'bg-accent/10 text-accent' : 'hover:bg-muted/10 text-foreground'}`}
                            onClick={() => navigate(item)}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                          >
                            <Icon size={16} className="shrink-0 text-muted" />
                            <div className="min-w-0 flex-1">
                              <span className="truncate block">{item.label}</span>
                            </div>
                            <span className="text-xs text-muted truncate max-w-[200px]">{item.subtitle}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="mt-1 px-5 pt-2.5 border-t border-border">
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted hover:text-foreground hover:bg-muted/5 transition-colors"
                    onClick={() => { router.push(`/search?q=${encodeURIComponent(query)}`); onClose(); }}
                  >
                    <ArrowRight size={14} />
                    View all results on Search page
                  </button>
                </div>
              </div>
            )}

            {showingLoading || showingNoResults || showingEmpty || showingResults ? null : (
              !query.trim() ? null : !loading && !results ? (
                <div className="py-8 text-center text-sm text-muted">
                  Type to start searching
                </div>
              ) : null
            )}
          </Modal.Body>

          <div className="flex items-center justify-between px-5 py-2.5 border-t border-border bg-muted/5 text-[11px] text-muted/60 rounded-b-xl">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><ArrowUp size={10} /><ArrowDown size={10} /> navigate</span>
              <span className="flex items-center gap-1"><CornerDownLeft size={10} /> open</span>
              <span className="flex items-center gap-1">esc close</span>
            </div>
            {showingEmpty && <span className="text-muted/40">{allItems.length} shortcuts</span>}
            {showingResults && <span className="text-muted/40">{flatResults.length} results</span>}
          </div>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
