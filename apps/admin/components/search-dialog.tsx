'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Header, Input, ListBox, type Key } from '@heroui/react';
import { ComboBox } from '@heroui/react/combo-box';
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

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

/** One selectable row. The same shape feeds navigation shortcuts and search hits. */
interface Option {
  key: string;
  label: string;
  subtitle?: string;
  icon: typeof LayoutDashboard;
  href?: string;
  type?: ResultType;
  id?: string;
  hint?: string;
}

interface OptionGroup {
  title: string;
  items: Option[];
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

const NAV_HINTS: Record<string, string> = { dashboard: '⌘1', shipments: '⌘2', customers: '⌘3' };

const ICONS: Record<ResultType, typeof Package> = { shipment: Package, customer: Users, invoice: Receipt };

const SECTION_PATH: Record<ResultType, string> = {
  shipment: 'shipments',
  customer: 'customers',
  invoice: 'invoices',
};

// ─── Component ─────────────────────────────────────────────────────────

export function SearchDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<Key | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults(null);
      setSelectedKey(null);
    }
  }, [isOpen]);

  // react-aria builds its option collection a moment after mount, so the focus
  // that lands from autoFocus is too early for menuTrigger="focus" to open the
  // listbox, and it never retries. Re-focus until the menu is up or the visitor
  // starts typing.
  useEffect(() => {
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const input = inputWrapRef.current?.querySelector('input');
      const open = input?.getAttribute('aria-expanded') === 'true';
      if (!open && input && !input.value) {
        input.blur();
        input.focus();
      }
      if (!open && tries++ < 12) timer = setTimeout(tick, 150);
    };
    timer = setTimeout(tick, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults(null); return; }
    setLoading(true);
    setResults(null);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.get<SearchResults>(`/api/search?q=${encodeURIComponent(query)}`);
        setResults(data);
      } catch { setResults(null); }
      setLoading(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const flatResults: Option[] = useMemo(() => {
    if (!results) return [];
    const items: Option[] = [];
    results.shipments.forEach((r) => items.push({
      key: `shipment:${r.id}`, type: 'shipment', id: r.id,
      label: r.trackingNo, subtitle: r.carrier ?? r.status, icon: ICONS.shipment,
    }));
    results.customers.forEach((r) => items.push({
      key: `customer:${r.id}`, type: 'customer', id: r.id,
      label: r.name, subtitle: r.email ?? '', icon: ICONS.customer,
    }));
    results.invoices.forEach((r) => items.push({
      key: `invoice:${r.id}`, type: 'invoice', id: r.id,
      label: r.invoiceNo, subtitle: `${r.amount} · ${r.status}`, icon: ICONS.invoice,
    }));
    return items;
  }, [results]);

  const groups: OptionGroup[] = useMemo(() => {
    // Shortcuts stay in the collection until the search lands. An empty
    // collection makes react-aria close the listbox mid search.
    if (!results) {
      return [
        { title: 'Navigate', items: NAV_ITEMS.map((n) => ({ key: `nav:${n.id}`, label: n.label, href: n.href, icon: n.icon, hint: NAV_HINTS[n.id] })) },
        { title: 'Quick Actions', items: QUICK_ACTIONS.map((a) => ({ key: `quick:${a.id}`, label: a.label, href: a.href, icon: a.icon })) },
      ];
    }
    const g: OptionGroup[] = [];
    const shipments = flatResults.filter((o) => o.type === 'shipment');
    const customers = flatResults.filter((o) => o.type === 'customer');
    const invoices = flatResults.filter((o) => o.type === 'invoice');
    if (shipments.length) g.push({ title: 'Shipments', items: shipments });
    if (customers.length) g.push({ title: 'Customers', items: customers });
    if (invoices.length) g.push({ title: 'Invoices', items: invoices });
    return g;
  }, [results, flatResults]);

  const options = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // A new query or a new result set invalidates whatever was highlighted.
  useEffect(() => {
    setSelectedKey(null);
  }, [query, results]);

  const showingEmpty = !query.trim();
  const showingLoading = loading && !!query.trim();
  const showingNoResults = !loading && !!results && flatResults.length === 0 && !!query.trim();
  const showingResults = !!results && !loading && !!query.trim() && flatResults.length > 0;
  const showMenu = showingEmpty || showingResults;

  const announcement = showingLoading
    ? 'Searching'
    : showingNoResults
      ? 'No results found'
      : showingResults
        ? `${flatResults.length} results`
        : `${options.length} shortcuts`;

  const openOption = useCallback((option: Option) => {
    if (option.href) {
      router.push(option.href);
    } else if (option.type && option.id) {
      router.push(`/${SECTION_PATH[option.type]}/${option.id}`);
    }
    onClose();
  }, [router, onClose]);

  // Enter opens the highlighted row; react-aria fires this for arrow key and
  // mouse selection alike, so both land on the same option.
  const handleSelectionChange = useCallback((key: Key | null) => {
    setSelectedKey(key);
    if (key == null) return;
    const option = options.find((o) => o.key === String(key));
    if (option) openOption(option);
  }, [options, openOption]);

  const viewAll = useCallback(() => {
    router.push(`/search?q=${encodeURIComponent(query)}`);
    onClose();
  }, [router, query, onClose]);

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    if (selectedKey != null) return;
    const first = options[0];
    if (first && showMenu) {
      e.preventDefault();
      openOption(first);
    } else if (query.trim()) {
      e.preventDefault();
      viewAll();
    }
  }

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Container>
        <Modal.Dialog className="max-w-2xl glass-panel border-glass" aria-label="Search">
          <Modal.Body className="p-0">
            <ComboBox.Root
              inputValue={query}
              onInputChange={setQuery}
              selectedKey={selectedKey}
              onSelectionChange={handleSelectionChange}
              menuTrigger="focus"
              // Server side search: react-aria would filter out results that
              // matched on email or tracking number only.
              defaultFilter={() => true}
            >
              <div className="px-5 pt-5 pb-3" ref={inputWrapRef}>
                <ComboBox.InputGroup className="w-full">
                  <Input
                    autoFocus
                    aria-label="Search"
                    placeholder="Search or navigate..."
                    onKeyDown={handleInputKeyDown}
                    className="w-full"
                  />
                </ComboBox.InputGroup>
              </div>

              <p className="sr-only" role="status" aria-live="polite">{announcement}</p>

              {showingLoading && (
                <div className="flex items-center justify-center gap-2 py-8">
                  <span className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                  <span className="text-sm text-muted">Searching...</span>
                </div>
              )}

              {showingNoResults && (
                <div className="py-10 text-center">
                  <Search size={28} className="mx-auto text-muted/40 mb-3" aria-hidden="true" />
                  <p className="text-sm text-muted">No results found</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs text-accent"
                    onPress={viewAll}
                  >
                    Search all fields on full page &rarr;
                  </Button>
                </div>
              )}

              <ComboBox.Popover className="max-h-[min(420px,50vh)]">
                  <ListBox aria-label="Search results" className="p-1">
                    {groups.map((group) => (
                      <ListBox.Section key={group.title}>
                        <Header className="px-3 py-2 text-[11px] font-semibold text-muted uppercase tracking-widest">
                          {group.title}
                          <span className="ml-2 text-muted/40 font-normal normal-case">{group.items.length}</span>
                        </Header>
                        {group.items.map((option) => (
                          <ListBox.Item
                            key={option.key}
                            id={option.key}
                            textValue={option.label}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground cursor-pointer transition-colors data-[focused]:bg-accent/10 data-[focused]:text-accent data-[hovered]:bg-accent/10 data-[hovered]:text-accent"
                          >
                            <option.icon size={16} className="shrink-0 text-muted" />
                            <span className="flex-1 truncate">{option.label}</span>
                            {option.subtitle && (
                              <span className="text-xs text-muted truncate max-w-[200px]">{option.subtitle}</span>
                            )}
                            {option.hint && (
                              <span className="text-[11px] text-muted/50 font-mono hidden sm:inline">{option.hint}</span>
                            )}
                          </ListBox.Item>
                        ))}
                      </ListBox.Section>
                    ))}
                  </ListBox>
              </ComboBox.Popover>
            </ComboBox.Root>
          </Modal.Body>

          <div className="flex items-center justify-between px-5 py-2.5 border-t border-border bg-muted/5 text-[11px] text-muted/60 rounded-b-xl">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><ArrowUp size={10} /><ArrowDown size={10} /> navigate</span>
              <span className="flex items-center gap-1"><CornerDownLeft size={10} /> open</span>
              <span className="flex items-center gap-1">esc close</span>
            </div>
            <div className="flex items-center gap-3">
              {showingResults && (
                <button
                  type="button"
                  className="flex items-center gap-1 text-accent hover:text-accent/80 transition-colors"
                  onClick={viewAll}
                >
                  View all <ArrowRight size={12} />
                </button>
              )}
              {showingEmpty && <span className="text-muted/40">{options.length} shortcuts</span>}
              {showingResults && <span className="text-muted/40">{flatResults.length} results</span>}
            </div>
          </div>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
