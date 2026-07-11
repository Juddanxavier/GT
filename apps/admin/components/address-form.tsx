'use client';

import type { ReactNode } from 'react';
import { Input, Select, ListBox } from '@heroui/react';

export interface AddressData {
  name?: string;
  phone?: string;
  email?: string;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

interface AddressFormProps {
  prefix: string;
  value: AddressData;
  onChange: (v: AddressData) => void;
  showContact?: boolean;
  showCountry?: boolean;
}

const COMMON_COUNTRIES = [
  { code: 'IN', name: 'India' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'AE', name: 'UAE' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'SG', name: 'Singapore' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'CN', name: 'China' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'TH', name: 'Thailand' },
];

function Field({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-1.5">{children}</div>;
}

function FormLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-[11px] font-semibold text-muted uppercase tracking-widest">
      {children}
    </label>
  );
}

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-0.5 h-3.5 bg-primary/60 rounded-full shrink-0" />
      <span className="text-[11px] font-semibold text-muted uppercase tracking-widest">{children}</span>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border/60 my-4" />;
}

export function AddressForm({ prefix, value, onChange, showContact, showCountry = true }: AddressFormProps): ReactNode {
  const set = (field: keyof AddressData) => (e: { target: { value: string } }) =>
    onChange({ ...value, [field]: e.target.value });

  return (
    <div>
      {showContact && (
        <>
          <SectionHeader>Contact</SectionHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FormLabel htmlFor={`${prefix}-phone`}>Phone</FormLabel>
              <Input id={`${prefix}-phone`} variant="secondary" type="tel" value={value.phone ?? ''} onChange={set('phone')} placeholder="+91 9876543210" />
            </Field>
            <Field>
              <FormLabel htmlFor={`${prefix}-email`}>Email</FormLabel>
              <Input id={`${prefix}-email`} variant="secondary" type="email" value={value.email ?? ''} onChange={set('email')} placeholder="email@example.com" />
            </Field>
          </div>
          <Divider />
        </>
      )}

      <SectionHeader>Address</SectionHeader>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Field>
            <FormLabel htmlFor={`${prefix}-name`}>Full Name</FormLabel>
            <Input id={`${prefix}-name`} variant="secondary" value={value.name ?? ''} onChange={set('name')} placeholder="Full name" />
          </Field>
        </div>
        <div className="col-span-2">
          <Field>
            <FormLabel htmlFor={`${prefix}-street`}>Street / Address</FormLabel>
            <Input id={`${prefix}-street`} variant="secondary" value={value.street ?? ''} onChange={set('street')} placeholder="Street address" />
          </Field>
        </div>
        <Field>
          <FormLabel htmlFor={`${prefix}-city`}>City</FormLabel>
          <Input id={`${prefix}-city`} variant="secondary" value={value.city ?? ''} onChange={set('city')} placeholder="City" />
        </Field>
        <Field>
          <FormLabel htmlFor={`${prefix}-state`}>State</FormLabel>
          <Input id={`${prefix}-state`} variant="secondary" value={value.state ?? ''} onChange={set('state')} placeholder="State" />
        </Field>
        <Field>
          <FormLabel htmlFor={`${prefix}-pincode`}>Pincode</FormLabel>
          <Input id={`${prefix}-pincode`} variant="secondary" value={value.pincode ?? ''} onChange={set('pincode')} placeholder="Pincode" />
        </Field>
        {showCountry && (
          <Field>
            <FormLabel htmlFor={`${prefix}-country`}>Country</FormLabel>
            <Select
              selectedKey={value.country ?? ''}
              onSelectionChange={(k) => onChange({ ...value, country: k as string })}
              variant="secondary"
              aria-label="Country"
            >
              <Select.Trigger className="h-10 text-sm">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {[{ code: '', name: 'Select country' }, ...COMMON_COUNTRIES].map((c) => (
                    <ListBox.Item key={c.code} id={c.code} textValue={c.name}>{c.name}</ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </Field>
        )}
      </div>
    </div>
  );
}

export function addressDisplay(a: AddressData | null | undefined): string {
  if (!a) return '—';
  const parts = [a.name, a.street, a.city, a.state, a.pincode, a.country].filter(Boolean);
  return parts.join(', ') || '—';
}
