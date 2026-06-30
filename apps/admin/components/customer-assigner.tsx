'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Chip, Input, Label } from '@heroui/react';
import { Check, Search, User, Phone, Mail, UserX, ChevronDown } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface CustomerAssignerProps {
  /** Full customer list for the current tenant */
  customers: Customer[];
  /** Currently selected customer ID, or empty string for none */
  customerId: string;
  /** Initial contact email (for editing unclaimed shipments) */
  contactEmail?: string;
  /** Initial contact phone (for editing unclaimed shipments) */
  contactPhone?: string;
  /** Called when selection changes */
  onChange: (params: {
    customerId: string | null;
    contactEmail: string;
    contactPhone: string;
  }) => void;
  /** Phone dial code prefix (e.g., +91) */
  phoneDialCode?: string;
  /** Phone country flag emoji */
  phoneFlag?: string;
  /** Error messages to show per field */
  errors?: Record<string, string>;
  /** Clear an error by field name */
  clearError?: (field: string) => void;
  /** Whether to show the "Self" option */
  showSelf?: boolean;
}

type Mode = 'search' | 'selected' | 'self' | 'contact-only';

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
  showSelf = true,
}: CustomerAssignerProps) {
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) ?? null,
    [customers, customerId],
  );

  const getModeFromProps = (): Mode => {
    if (customerId === 'self') return 'self';
    if (selectedCustomer) return 'selected';
    if (initialContactEmail || initialContactPhone) return 'contact-only';
    return 'search';
  };

  const [mode, setMode] = useState<Mode>(getModeFromProps);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [contactEmail, setContactEmail] = useState(
    initialContactEmail && !selectedCustomer ? initialContactEmail : '',
  );
  const [contactPhoneLocal, setContactPhoneLocal] = useState(
    initialContactPhone && !selectedCustomer ? stripDialCode(initialContactPhone, phoneDialCode) : '',
  );

  // Track previous props to detect meaningful changes (modal re-opens, different shipment)
  const prevPropsRef = useRef<{ customerId: string | null; initialContactEmail: string; initialContactPhone: string }>({
    customerId: null,
    initialContactEmail: '',
    initialContactPhone: '',
  });

  // Reset internal state when external props change (e.g. modal re-opens for different shipment)
  useEffect(() => {
    const prev = prevPropsRef.current;
    const current = { customerId, initialContactEmail, initialContactPhone };
    // Only reset if props actually changed (skip initial mount)
    if (prev.customerId !== customerId || prev.initialContactEmail !== initialContactEmail || prev.initialContactPhone !== initialContactPhone) {
      const newMode = getModeFromProps();
      prevPropsRef.current = current;
      setMode(newMode);
      setSearchQuery('');
      setShowDropdown(false);
      if (newMode === 'contact-only') {
        setContactEmail(initialContactEmail ?? '');
        setContactPhoneLocal(stripDialCode(initialContactPhone ?? '', phoneDialCode));
      } else {
        setContactEmail('');
        setContactPhoneLocal('');
      }
    }
  }, [customerId, selectedCustomer, initialContactEmail, initialContactPhone, phoneDialCode]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return customers.slice(0, 50);
    const q = searchQuery.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q),
    ).slice(0, 50);
  }, [customers, searchQuery]);

  function selectCustomer(cust: Customer) {
    setMode('selected');
    setShowDropdown(false);
    setSearchQuery('');
    onChange({ customerId: cust.id, contactEmail: '', contactPhone: '' });
  }

  function selectSelf() {
    setMode('self');
    setShowDropdown(false);
    setSearchQuery('');
    onChange({ customerId: 'self', contactEmail: '', contactPhone: '' });
  }

  function setContactOnly() {
    const fullPhone = contactPhoneLocal ? `${phoneDialCode} ${contactPhoneLocal}` : '';
    if (!contactEmail && !fullPhone) return;
    setMode('contact-only');
    setShowDropdown(false);
    onChange({ customerId: null, contactEmail, contactPhone: fullPhone });
  }

  function resetMode() {
    setMode('search');
    setSearchQuery('');
    setContactEmail('');
    setContactPhoneLocal('');
    setShowDropdown(false);
    clearError?.('customerId');
  }

  const inputBase =
    'w-full px-3 py-2 border border-border rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all';

  // ── Selected customer ──
  if (mode === 'selected' && selectedCustomer) {
    return (
      <div className="space-y-2">
        <Label>Customer</Label>
        <div className="rounded-xl border border-success/30 bg-success/[0.02] overflow-hidden">
          <div className="p-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0 mt-0.5">
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
                {selectedCustomer.email && (
                  <p className="text-xs text-muted flex items-center gap-1 mt-1">
                    <Mail size={11} />
                    {selectedCustomer.email}
                  </p>
                )}
                {selectedCustomer.phone && (
                  <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                    <Phone size={11} />
                    {selectedCustomer.phone}
                  </p>
                )}
                <p className="text-[11px] text-success flex items-center gap-1 mt-1.5">
                  <Check size={10} />
                  Will receive tracking notifications
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={resetMode}
              className="text-xs text-muted hover:text-foreground underline shrink-0 mt-1 transition-colors"
            >
              Change
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Self (no notifications) ──
  if (mode === 'self') {
    return (
      <div className="space-y-2">
        <Label>Customer</Label>
        <div className="rounded-xl border border-warning/30 bg-warning/[0.02] overflow-hidden">
          <div className="p-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-full bg-warning/10 text-warning flex items-center justify-center shrink-0 mt-0.5">
                <UserX size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Self — no notifications</p>
                <p className="text-xs text-muted mt-1">
                  The shipment will not send email or WhatsApp updates
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={resetMode}
              className="text-xs text-muted hover:text-foreground underline shrink-0 mt-1 transition-colors"
            >
              Change
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Contact-only (unclaimed) ──
  if (mode === 'contact-only') {
    return (
      <div className="space-y-2">
        <Label>Customer</Label>
        <div className="rounded-xl border border-accent/30 bg-accent/[0.02] overflow-hidden">
          <div className="p-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5">
                <User size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {contactEmail || `${phoneDialCode} ${contactPhoneLocal}`}
                </p>
                <p className="text-[11px] text-accent flex items-center gap-1 mt-1">
                  <Search size={10} />
                  Unclaimed — customer can claim via portal
                </p>
                {contactEmail && (
                  <p className="text-[11px] text-muted mt-0.5">
                    Notifications will be sent to this contact info
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={resetMode}
              className="text-xs text-muted hover:text-foreground underline shrink-0 mt-1 transition-colors"
            >
              Change
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Search mode (default) ──
  return (
    <div className="space-y-2">
      <Label>Customer</Label>
      <div className="relative">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search customers by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            className={`${inputBase} pl-9 pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowDropdown((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
          >
            <ChevronDown
              size={14}
              className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <>
            {/* Backdrop to close dropdown */}
            <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
            <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-xl border border-border bg-surface shadow-lg overflow-hidden">
              {/* Search results */}
              <div className="max-h-56 overflow-y-auto divide-y divide-border/40">
                {filtered.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-muted font-medium">No customers found</p>
                    <p className="text-xs text-muted mt-1">
                      Enter contact info below to save for later claiming
                    </p>
                  </div>
                ) : (
                  filtered.map((cust) => (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => selectCustomer(cust)}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/5 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-muted/10 text-muted flex items-center justify-center shrink-0 mt-0.5">
                        <User size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{cust.name}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                          {cust.email && (
                            <span className="text-xs text-muted flex items-center gap-1">
                              <Mail size={10} />
                              {cust.email}
                            </span>
                          )}
                          {cust.phone && (
                            <span className="text-xs text-muted flex items-center gap-1">
                              <Phone size={10} />
                              {cust.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <Check size={14} className="text-muted/30 shrink-0 mt-2" />
                    </button>
                  ))
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-border/60" />

              {/* Unclaimed / contact entry */}
              <div className="p-4 space-y-3">
                <p className="text-[11px] text-muted font-medium uppercase tracking-wider">
                  Or enter contact for unclaimed shipment
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    variant="secondary"
                    placeholder="Email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    fullWidth
                  />
                  <div className="flex">
                    <div className="flex items-center gap-1 px-2.5 border border-r-0 border-border rounded-l-lg bg-muted/10 text-xs text-muted font-medium shrink-0">
                      {phoneFlag && <span>{phoneFlag}</span>}
                      {phoneDialCode}
                    </div>
                    <Input
                      variant="secondary"
                      placeholder="Phone"
                      value={contactPhoneLocal}
                      onChange={(e) =>
                        setContactPhoneLocal(e.target.value.replace(/\D/g, ''))
                      }
                      className="rounded-l-none border-l-0 flex-1 min-w-0 [&_input]:rounded-l-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    isDisabled={!contactEmail && !contactPhoneLocal}
                    onPress={setContactOnly}
                  >
                    Use Contact
                  </Button>
                  {showSelf && (
                    <Button size="sm" variant="outline" onPress={selectSelf}>
                      Self (No Notifications)
                    </Button>
                  )}
                </div>
                {contactEmail && (
                  <p className="text-[11px] text-muted">
                    Customer can claim this shipment later via the tracking portal
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      {errors.customerId && <p className="text-xs text-danger">{errors.customerId}</p>}
    </div>
  );
}
