'use client';

import type { ReactNode } from 'react';
import { Input } from '@heroui/react';
import { COUNTRIES } from '@/lib/countries';

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
  errors?: Record<string, string>;
  onFieldBlur?: (field: string) => void;
}

const ALL_COUNTRIES = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));

function Field({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-1.5">{children}</div>;
}

function FormLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[11px] font-semibold text-muted uppercase tracking-widest"
    >
      {children}
    </label>
  );
}

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-0.5 h-3.5 bg-primary/60 rounded-full shrink-0" />
      <span className="text-[11px] font-semibold text-muted uppercase tracking-widest">
        {children}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border/60 my-4" />;
}

export function AddressForm({
  prefix,
  value,
  onChange,
  showContact,
  showCountry = true,
  errors = {},
  onFieldBlur,
}: AddressFormProps): ReactNode {
  const set = (field: keyof AddressData) => (e: { target: { value: string } }) =>
    onChange({ ...value, [field]: e.target.value });

  const errorFor = (field: keyof AddressData) => errors[`${prefix}.${field}`];
  const blurFor = (field: keyof AddressData) => () => onFieldBlur?.(`${prefix}.${field}`);
  const inputClass = (field: keyof AddressData) => (errorFor(field) ? 'border-danger' : undefined);
  const describedBy = (field: keyof AddressData) =>
    errorFor(field) ? `${prefix}-${field}-error` : undefined;

  function renderError(field: keyof AddressData) {
    const message = errorFor(field);
    if (!message) return null;
    return (
      <p id={`${prefix}-${field}-error`} className="text-[11px] text-danger-soft-foreground">
        {message}
      </p>
    );
  }

  return (
    <div>
      {showContact && (
        <>
          <SectionHeader>Contact</SectionHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FormLabel htmlFor={`${prefix}-phone`}>Phone</FormLabel>
              <Input
                id={`${prefix}-phone`}
                variant="secondary"
                type="tel"
                value={value.phone ?? ''}
                onChange={set('phone')}
                onBlur={blurFor('phone')}
                aria-invalid={!!errorFor('phone')}
                aria-describedby={describedBy('phone')}
                className={inputClass('phone')}
                placeholder="+91 9876543210"
              />
              {renderError('phone')}
            </Field>
            <Field>
              <FormLabel htmlFor={`${prefix}-email`}>Email</FormLabel>
              <Input
                id={`${prefix}-email`}
                variant="secondary"
                type="email"
                value={value.email ?? ''}
                onChange={set('email')}
                onBlur={blurFor('email')}
                aria-invalid={!!errorFor('email')}
                aria-describedby={describedBy('email')}
                className={inputClass('email')}
                placeholder="email@example.com"
              />
              {renderError('email')}
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
            <Input
              id={`${prefix}-name`}
              variant="secondary"
              value={value.name ?? ''}
              onChange={set('name')}
              onBlur={blurFor('name')}
              aria-invalid={!!errorFor('name')}
              aria-describedby={describedBy('name')}
              className={inputClass('name')}
              placeholder="Full name"
            />
            {renderError('name')}
          </Field>
        </div>
        <div className="col-span-2">
          <Field>
            <FormLabel htmlFor={`${prefix}-street`}>Street / Address</FormLabel>
            <Input
              id={`${prefix}-street`}
              variant="secondary"
              value={value.street ?? ''}
              onChange={set('street')}
              onBlur={blurFor('street')}
              aria-invalid={!!errorFor('street')}
              aria-describedby={describedBy('street')}
              className={inputClass('street')}
              placeholder="Street address"
            />
            {renderError('street')}
          </Field>
        </div>
        <Field>
          <FormLabel htmlFor={`${prefix}-city`}>City</FormLabel>
          <Input
            id={`${prefix}-city`}
            variant="secondary"
            value={value.city ?? ''}
            onChange={set('city')}
            onBlur={blurFor('city')}
            aria-invalid={!!errorFor('city')}
            aria-describedby={describedBy('city')}
            className={inputClass('city')}
            placeholder="City"
          />
          {renderError('city')}
        </Field>
        <Field>
          <FormLabel htmlFor={`${prefix}-state`}>State</FormLabel>
          <Input
            id={`${prefix}-state`}
            variant="secondary"
            value={value.state ?? ''}
            onChange={set('state')}
            onBlur={blurFor('state')}
            aria-invalid={!!errorFor('state')}
            aria-describedby={describedBy('state')}
            className={inputClass('state')}
            placeholder="State"
          />
          {renderError('state')}
        </Field>
        <Field>
          <FormLabel htmlFor={`${prefix}-pincode`}>Pincode</FormLabel>
          <Input
            id={`${prefix}-pincode`}
            variant="secondary"
            value={value.pincode ?? ''}
            onChange={set('pincode')}
            onBlur={blurFor('pincode')}
            aria-invalid={!!errorFor('pincode')}
            aria-describedby={describedBy('pincode')}
            className={inputClass('pincode')}
            placeholder="Pincode"
          />
          {renderError('pincode')}
        </Field>
        {showCountry && (
          <Field>
            <FormLabel htmlFor={`${prefix}-country`}>Country</FormLabel>
            <Input
              id={`${prefix}-country`}
              variant="secondary"
              value={value.country ?? ''}
              onChange={(e) => onChange({ ...value, country: e.target.value })}
              onBlur={blurFor('country')}
              aria-invalid={!!errorFor('country')}
              aria-describedby={describedBy('country')}
              className={inputClass('country')}
              placeholder="Type or select a country"
              list={`${prefix}-country-list`}
            />
            {renderError('country')}
            <datalist id={`${prefix}-country-list`}>
              {ALL_COUNTRIES.map((c) => (
                <option key={c.code} value={c.name} />
              ))}
            </datalist>
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
