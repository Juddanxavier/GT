'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Chip, Input, Label } from '@heroui/react';
import { Check, Mail, Phone, Search, User, UserX } from 'lucide-react';

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
  showSelf = true,
  loading,
}: CustomerAssignerProps) {
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) ?? null,
    [customers, customerId],
  );

  const [lookupEmail, setLookupEmail] = useState(
    !selectedCustomer ? initialContactEmail : '',
  );
  const [lookupPhone, setLookupPhone] = useState(
    !selectedCustomer ? stripDialCode(initialContactPhone, phoneDialCode) : '',
  );
  const [lookupResult, setLookupResult] = useState<Customer | null>(null);
  const [lookupDone, setLookupDone] = useState(!!selectedCustomer);
  const [lookupError, setLookupError] = useState('');

  // reset on prop change for different shipment
  useEffect(() => {
    if (!selectedCustomer) {
      setLookupEmail(initialContactEmail);
      setLookupPhone(stripDialCode(initialContactPhone, phoneDialCode));
      setLookupDone(false);
      setLookupResult(null);
      setLookupError('');
    }
  }, [initialContactEmail, initialContactPhone, selectedCustomer]);

  function handleLookup() {
    const q = (lookupEmail.trim() + ' ' + lookupPhone.trim()).toLowerCase();
    if (!q) return;
    const matched = customers.find(
      (c) =>
        (c.email && c.email.toLowerCase().includes(lookupEmail.trim().toLowerCase())) ||
        (c.phone && c.phone.toLowerCase().includes(lookupPhone.trim())),
    );
    if (matched) {
      setLookupResult(matched);
      setLookupDone(true);
      setLookupError('');
      onChange({ customerId: matched.id, contactEmail: '', contactPhone: '' });
    } else {
      setLookupResult(null);
      setLookupDone(true);
      setLookupError('');
      onChange({ customerId: null, contactEmail: lookupEmail.trim(), contactPhone: lookupPhone.trim() ? `${phoneDialCode} ${lookupPhone.trim()}` : '' });
    }
  }

  function selectSelf() {
    onChange({ customerId: 'self', contactEmail: '', contactPhone: '' });
  }

  // ── Selected ──
  if (selectedCustomer) {
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
                  <p className="text-xs text-muted flex items-center gap-1 mt-1"><Mail size={11} />{selectedCustomer.email}</p>
                )}
                {selectedCustomer.phone && (
                  <p className="text-xs text-muted flex items-center gap-1 mt-0.5"><Phone size={11} />{selectedCustomer.phone}</p>
                )}
                <p className="text-[11px] text-success flex items-center gap-1 mt-1.5"><Check size={10} />Will receive tracking notifications</p>
              </div>
            </div>
            <button type="button" onClick={() => { setLookupDone(false); setLookupResult(null); setLookupEmail(''); setLookupPhone(''); onChange({ customerId: null, contactEmail: '', contactPhone: '' }); }}
              className="text-xs text-muted hover:text-foreground underline shrink-0 mt-1 transition-colors">Change</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Self ──
  if (customerId === 'self') {
    return (
      <div className="space-y-2">
        <Label>Customer</Label>
        <div className="rounded-xl border border-warning/30 bg-warning/[0.02] overflow-hidden">
          <div className="p-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-full bg-warning/10 text-warning flex items-center justify-center shrink-0 mt-0.5"><UserX size={18} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Self — no notifications</p>
                <p className="text-xs text-muted mt-1">The shipment will not send email or WhatsApp updates</p>
              </div>
            </div>
            <button type="button" onClick={() => { onChange({ customerId: null, contactEmail: '', contactPhone: '' }); }}
              className="text-xs text-muted hover:text-foreground underline shrink-0 mt-1 transition-colors">Change</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Customer</Label>
      <div className="grid grid-cols-2 gap-2">
        <Input variant="secondary" placeholder="Email" value={lookupEmail} onChange={(e) => { setLookupEmail(e.target.value); setLookupDone(false); }} fullWidth />
        <div className="flex">
          <div className="flex items-center gap-1 px-2.5 border border-r-0 border-border rounded-l-lg bg-muted/10 text-xs text-muted font-medium shrink-0">
            {phoneFlag && <span>{phoneFlag}</span>}{phoneDialCode}
          </div>
          <Input variant="secondary" placeholder="Phone" value={lookupPhone} onChange={(e) => { setLookupPhone(e.target.value.replace(/\D/g, '')); setLookupDone(false); }}
            className="rounded-l-none border-l-0 flex-1 min-w-0 [&_input]:rounded-l-none" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="primary" isDisabled={!lookupEmail.trim() && !lookupPhone.trim()} isPending={loading} onPress={handleLookup}>
          <Search size={14} /> Lookup
        </Button>
        {showSelf && (
          <Button size="sm" variant="outline" onPress={selectSelf}>Self (No Notifications)</Button>
        )}
      </div>
      {lookupDone && !lookupResult && (
        <p className="text-xs text-muted">No matching customer — shipment can be claimed later via the tracking portal</p>
      )}
      {lookupError && <p className="text-xs text-danger">{lookupError}</p>}
      {errors.customerId && <p className="text-xs text-danger">{errors.customerId}</p>}
    </div>
  );
}
