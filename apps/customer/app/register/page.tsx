'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { z } from 'zod';
import { Button, Input, InputGroup, TextField, Label, FieldError } from '@heroui/react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '@/components/auth-layout';
import { useTenantConfig } from '@/lib/use-tenant-config';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FieldErrors = Partial<Record<keyof z.infer<typeof registerSchema>, string>>;

const tenantByDomain: Record<string, string> = {
  'gajantraders.com': 'gajan-traders',
  'www.gajantraders.com': 'gajan-traders',
  'lankamahal.lk': 'lanka-mahal',
  'www.lankamahal.lk': 'lanka-mahal',
};

function getTenantSlug(): string {
  if (typeof window === 'undefined') return 'gajan-traders';
  const host = window.location.hostname;
  return tenantByDomain[host] ?? 'gajan-traders';
}

function RegisterForm(): ReactNode {
  const config = useTenantConfig();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  const isEmerald = config.theme === 'emerald';
  const btnClass = isEmerald ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-violet-600 hover:bg-violet-700';

  const API_BASE = '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    if (honeypot) return;
    const result = registerSchema.safeParse({ name, email, password });
    if (!result.success) {
      setFieldErrors(Object.fromEntries(result.error.issues.map((i) => [i.path[0] as string, i.message])));
      return;
    }
    setFieldErrors({});
    setLoading(true);

    const tenantSlug = getTenantSlug();

    try {
      const res = await fetch(`${API_BASE}/api/customers/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        credentials: 'include',
        body: JSON.stringify({ email: result.data.email, password: result.data.password, name: result.data.name }),
      });
      const body = await res.json();
      if (!res.ok) {
        setSubmitError(body.error || 'Registration failed');
        return;
      }
      window.location.href = '/';
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Connection failed. Please try again.');
      console.error('[register] unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout config={config} title="Create your account" subtitle="Start tracking your shipments">
      {submitError && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger mb-6">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><circle cx="8" cy="8" r="7"/><path d="M8 5v3M8 10.5v.5"/></svg>
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Honeypot */}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor="hp-field">Leave empty</label>
          <input
            id="hp-field"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        <TextField fullWidth isInvalid={!!fieldErrors.name} name="name" type="text" value={name} onChange={(v) => setName(v)}>
          <Label>Full Name</Label>
          <Input placeholder="Your full name" autoComplete="name" />
          {fieldErrors.name && <FieldError>{fieldErrors.name}</FieldError>}
        </TextField>

        <TextField fullWidth isInvalid={!!fieldErrors.email} name="email" type="email" value={email} onChange={(v) => setEmail(v)}>
          <Label>Email</Label>
          <Input placeholder="name@example.com" autoComplete="email" />
          {fieldErrors.email && <FieldError>{fieldErrors.email}</FieldError>}
        </TextField>

        <TextField fullWidth isInvalid={!!fieldErrors.password} name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(v) => setPassword(v)}>
          <Label>Password</Label>
          <InputGroup fullWidth>
            <InputGroup.Input placeholder="Create a password (min. 8 characters)" autoComplete="new-password" />
            <InputGroup.Suffix className="pr-0">
              <Button
                isIconOnly
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                size="sm"
                variant="ghost"
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </InputGroup.Suffix>
          </InputGroup>
          {fieldErrors.password && <FieldError>{fieldErrors.password}</FieldError>}
        </TextField>

        <Button type="submit" fullWidth isDisabled={loading} isPending={loading} className={`text-white font-medium shadow-sm shadow-black/10 ${btnClass} h-11`}>
          {loading ? 'Creating account...' : 'Create account'}
        </Button>

        <p className="text-center text-xs text-muted">
          Already have an account?{' '}
          <a href="/login" className={`font-semibold underline underline-offset-2 transition-colors ${isEmerald ? 'text-emerald-600 hover:text-emerald-700' : 'text-violet-600 hover:text-violet-700'}`}>
            Sign in
          </a>
        </p>

        <p className="text-center text-xs text-muted/60">
          By creating an account, you agree to our{' '}
          <a href="/terms" className="text-muted hover:text-foreground underline underline-offset-2 transition-colors">Terms of Service</a>
        </p>
      </form>
    </AuthLayout>
  );
}

export default function RegisterPage(): ReactNode {
  return <ErrorBoundary><RegisterForm /></ErrorBoundary>;
}
