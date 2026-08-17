'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@heroui/react';
import { Search, Package, Users, Receipt, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { usePageTitle } from '@/lib/use-page-title';

interface SearchResults {
  shipments: { id: string; trackingNo: string; status: string; carrier: string | null }[];
  customers: { id: string; name: string; email: string | null }[];
  invoices: { id: string; invoiceNo: string; amount: string; status: string }[];
}

export default function SearchPage() {
  usePageTitle('Search');
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams?.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults(null); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await api.get<SearchResults>(`/api/search?q=${encodeURIComponent(query)}&limit=20`);
        setResults(data);
      } catch { setResults(null); }
      setLoading(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const total = results ? results.shipments.length + results.customers.length + results.invoices.length : 0;

  function ResultCard({ icon: Icon, href, label, subtitle }: { icon: typeof Package; href: string; label: string; subtitle: string }) {
    return (
      <button
        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:bg-muted/5 transition-colors text-left"
        onClick={() => router.push(href)}
      >
        <Icon size={18} className="text-muted shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{label}</p>
          <p className="text-xs text-muted truncate">{subtitle}</p>
        </div>
        <ArrowRight size={14} className="text-muted shrink-0" />
      </button>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold mb-1">Search</h1>
        <p className="text-sm text-muted">Find shipments, customers, and invoices across your organization.</p>
      </div>

      <Input
        placeholder="Search shipments, customers, invoices..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        size={40}
        autoFocus
        aria-label="Search"
      />

      {loading && <p className="text-sm text-muted">Searching...</p>}

      {!loading && results && query && (
        <p className="text-sm text-muted">{total} result{total !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;</p>
      )}

      {!loading && results && total === 0 && (
        <div className="text-center py-12">
          <Search size={32} className="mx-auto text-muted mb-2" />
          <p className="text-sm text-muted">No results found for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {!loading && results && (
        <div className="space-y-6">
          {results.shipments.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                <Package size={14} /> Shipments ({results.shipments.length})
              </h2>
              <div className="space-y-1">
                {results.shipments.map((r) => (
                  <ResultCard key={`ship-${r.id}`} icon={Package} href={`/shipments/${r.trackingNo}`} label={r.trackingNo} subtitle={r.carrier ?? r.status} />
                ))}
              </div>
            </section>
          )}
          {results.customers.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                <Users size={14} /> Customers ({results.customers.length})
              </h2>
              <div className="space-y-1">
                {results.customers.map((r) => (
                  <ResultCard key={`cust-${r.id}`} icon={Users} href={`/customers/${r.id}`} label={r.name} subtitle={r.email ?? ''} />
                ))}
              </div>
            </section>
          )}
          {results.invoices.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                <Receipt size={14} /> Invoices ({results.invoices.length})
              </h2>
              <div className="space-y-1">
                {results.invoices.map((r) => (
                  <ResultCard key={`inv-${r.id}`} icon={Receipt} href={`/invoices/${r.invoiceNo}`} label={r.invoiceNo} subtitle={`${r.amount} · ${r.status}`} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
