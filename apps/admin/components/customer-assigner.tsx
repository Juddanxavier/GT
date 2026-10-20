'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Chip, Input, Label, ListBox, ListBoxItem, Popover } from '@heroui/react';
import { Check, ChevronDown, Mail, Phone, Search, User, UserX, X } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface CustomerAssignerProps {
  customers: Customer[];
  customerId: string;
  contactEmail?: string;
  contactPhone?: string;
  onChange: (params: {
    customerId: string | null;
    contactEmail: string;
    contactPhone: string;
  }) => void;
  phoneDialCode?: string;
  phoneFlag?: string;
  errors?: Record<string, string>;
  clearError?: (field: string) => void;
  onFieldBlur?: (field: string) => void;
  showSelf?: boolean;
  loading?: boolean;
}

function stripDialCode(phone: string, dialCode: string): string {
  return phone.replace(dialCode, '').trim();
}

export function CustomerAssigner({
  customers,
  customerId,
  contactEmail: initialContactEmail = '',
  contactPhone: initialContactPhone = '',
  onChange,
  phoneDialCode = '+91',
  phoneFlag,
  errors = {},
  clearError,
  onFieldBlur,
  showSelf = true,
  loading,
}: CustomerAssignerProps) {
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) ?? null,
    [customers, customerId],
  );

  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [overrideEmail, setOverrideEmail] = useState('');
  const [overridePhone, setOverridePhone] = useState('');
  const [overrideActive, setOverrideActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q),
    ).slice(0, 20);
  }, [customers, query]);

  // Reset when shipment changes
  useEffect(() => {
    if (!selectedCustomer) {
      setOverrideEmail(initialContactEmail);
      setOverridePhone(stripDialCode(initialContactPhone, phoneDialCode));
      setOverrideActive(false);
      setQuery('');
    }
  }, [initialContactEmail, initialContactPhone, selectedCustomer, phoneDialCode]);

  function selectCustomer(c: Customer) {
    setQuery(c.name);
    setShowResults(false);
    setOverrideActive(false);
    onChange({ customerId: c.id, contactEmail: '', contactPhone: '' });
  }

  function handleOverrideToggle() {
    if (overrideActive) {
      setOverrideActive(false);
      onChange({ customerId, contactEmail: '', contactPhone: '' });
    } else {
      setOverrideActive(true);
      if (initialContactEmail) setOverrideEmail(initialContactEmail);
      if (initialContactPhone) setOverridePhone(stripDialCode(initialContactPhone, phoneDialCode));
    }
  }

  function handleOverrideChange() {
    onChange({
      customerId: customerId,
      contactEmail: overrideEmail.trim() || '',
      contactPhone: overridePhone.trim() ? `${phoneDialCode} ${overridePhone.trim()}` : '',
    });
  }

  function handleManualContact() {
    const email = query.trim();
    const phoneMatch = query.match(/^(\+\d{1,3})?\s?(\d{4,14})$/);
    if (email.includes('@')) {
      onChange({ customerId: null, contactEmail: email, contactPhone: '' });
    } else if (phoneMatch) {
      onChange({ customerId: null, contactEmail: '', contactPhone: query });
    }
    setQuery('');
  }

  function selectSelf() {
    setQuery('');
    setShowResults(false);
    onChange({ customerId: 'self', contactEmail: '', contactPhone: '' });
  }

  function clearSelection() {
    setQuery('');
    setOverrideActive(false);
    onChange({ customerId: null, contactEmail: '', contactPhone: '' });
  }

  // Selected customer card
  if (selectedCustomer) {
    return (
      <div className="space-y-2">
        <Label>Customer</Label>
        <div className="rounded-sm border border-success/30 bg-success/[0.02] overflow-hidden">
          <div className="p-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-full bg-success/10 text-success-soft-foreground flex items-center justify-center shrink-0 mt-0.5">
                <User size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold truncate">{selectedCustomer.name}</span>
                  <Chip size="sm" variant="soft" color="success" className="shrink-0">
                    <Check size={10} className="inline mr-0.5" />
                    Linked
                  </Chip>
                </div>
                <p className="text-xs text-muted flex items-center gap-1 mt-1"><Mail size={11} />{selectedCustomer.email ?? '—'}</p>
                <p className="text-xs text-muted flex items-center gap-1 mt-0.5"><Phone size={11} />{selectedCustomer.phone ?? '—'}</p>
                <p className="text-[11px] text-success-soft-foreground flex items-center gap-1 mt-1.5"><Check size={10} />Will receive tracking notifications</p>
              </div>
            </div>
            <button type="button" onClick={clearSelection}
              className="text-xs text-muted hover:text-foreground underline shrink-0 mt-1 transition-colors">Change</button>
          </div>
        </div>
        <button type="button" onClick={handleOverrideToggle}
          className="text-xs text-muted hover:text-foreground underline transition-colors">
          {overrideActive ? 'Use customer profile contact' : 'Override contact info for this shipment'}
        </button>
        {overrideActive && (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Input
                id="contact-email-input"
                variant="secondary"
                placeholder="Email"
                aria-label="Override email"
                value={overrideEmail}
                aria-invalid={!!errors.contactEmail}
                aria-describedby={errors.contactEmail ? 'override-email-error' : undefined}
                className={errors.contactEmail ? 'border-danger' : undefined}
                onChange={(e) => { setOverrideEmail(e.target.value); }}
                onBlur={() => { handleOverrideChange(); onFieldBlur?.('contactEmail'); }}
              />
              {errors.contactEmail && (
                <p id="override-email-error" className="text-[11px] text-danger-soft-foreground">{errors.contactEmail}</p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex">
                <div className="flex items-center gap-1 px-2.5 border border-r-0 border-border rounded-l-lg bg-muted/10 text-xs text-muted font-medium shrink-0">
                  {phoneFlag && <span>{phoneFlag}</span>}{phoneDialCode}
                </div>
                <Input
                  id="contact-phone-input"
                  variant="secondary"
                  placeholder="Phone"
                  aria-label="Override phone"
                  value={overridePhone}
                  aria-invalid={!!errors.contactPhone}
                  aria-describedby={errors.contactPhone ? 'override-phone-error' : undefined}
                  onChange={(e) => { setOverridePhone(e.target.value.replace(/\D/g, '')); }}
                  onBlur={() => { handleOverrideChange(); onFieldBlur?.('contactPhone'); }}
                  className={`rounded-l-none border-l-0 flex-1 min-w-0 [&_input]:rounded-l-none ${errors.contactPhone ? 'border-danger' : ''}`}
                />
              </div>
              {errors.contactPhone && (
                <p id="override-phone-error" className="text-[11px] text-danger-soft-foreground">{errors.contactPhone}</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Self card
  if (customerId === 'self') {
    return (
      <div className="space-y-2">
        <Label>Customer</Label>
        <div className="rounded-sm border border-warning/30 bg-warning/[0.02] overflow-hidden">
          <div className="p-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-full bg-warning/10 text-warning-soft-foreground flex items-center justify-center shrink-0 mt-0.5"><UserX size={18} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Self — no notifications</p>
                <p className="text-xs text-muted mt-1">The shipment will not send email or WhatsApp updates</p>
              </div>
            </div>
            <button type="button" onClick={clearSelection}
              className="text-xs text-muted hover:text-foreground underline shrink-0 mt-1 transition-colors">Change</button>
          </div>
        </div>
      </div>
    );
  }

  // Search / manual entry
  return (
    <div className="space-y-2">
      <Label>Customer</Label>
      <div className="relative">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          {query && (
            <button type="button" onClick={() => { setQuery(''); setShowResults(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground">
              <X size={14} />
            </button>
          )}
              <input
                ref={inputRef}
                id="customer-assigner-input"
                className="w-full h-10 px-9 rounded-sm border border-border bg-background text-sm placeholder:text-muted outline-none focus:border-foreground/30 transition-colors"
                placeholder="Search customer by name, email, or phone..."
                value={query}
                role="combobox"
                aria-expanded={showResults && !!query.trim()}
                aria-controls={showResults && query.trim() ? 'customer-assigner-results' : undefined}
                aria-autocomplete="list"
                onChange={(e) => { setQuery(e.target.value); setShowResults(true); clearError?.('customerId'); }}
            onFocus={() => query.trim() && setShowResults(true)}
          />
        </div>
        {showResults && query.trim() && (
          <div
            id="customer-assigner-results"
            role="listbox"
            aria-label="Matching customers"
            className="absolute z-50 top-full mt-1 left-0 right-0 bg-background border border-border rounded-sm max-h-64 overflow-y-auto"
          >
            {results.length > 0 ? (
              results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  onClick={() => selectCustomer(c)}
                  className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-muted/10 text-left transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-muted/20 text-muted flex items-center justify-center shrink-0">
                    <User size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted truncate">
                      {[c.email, c.phone].filter(Boolean).join(' · ') || 'No contact'}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-3 py-3 text-xs text-muted">
                <p>No matching customer found.</p>
                <p className="mt-1">Enter email/phone below to save contact info.</p>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {showSelf && (
          <Button size="sm" variant="outline" onPress={selectSelf}>Self (No Notifications)</Button>
        )}
      </div>
      {errors.customerId && <p className="text-xs text-danger-soft-foreground">{errors.customerId}</p>}
    </div>
  );
}
