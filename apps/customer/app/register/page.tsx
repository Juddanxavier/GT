'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { AuthAlert } from '@/components/auth/auth-alert';
import { PasswordField } from '@/components/auth/password-field';
import { AuthLayout } from '@/components/auth-layout';
import { ErrorBoundary } from '@/components/error-boundary';
import { authClient } from '@/lib/auth-client';
import { useTenantConfig } from '@/lib/use-tenant-config';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FieldErrors = Partial<Record<keyof z.infer<typeof registerSchema>, string>>;

function RegisterForm(): ReactNode {
  const config = useTenantConfig();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setSubmitError('');
    if (honeypot) return;
    const result = registerSchema.safeParse({ name, email, password });
    if (!result.success) {
      setFieldErrors(
        Object.fromEntries(result.error.issues.map((i) => [i.path[0] as string, i.message])),
      );
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      const res = await fetch('/api/customers/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': config.slug,
        },
        credentials: 'include',
        body: JSON.stringify({
          email: result.data.email,
          password: result.data.password,
          name: result.data.name,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        const err = body.error;
        setSubmitError(
          typeof err === 'string'
            ? err
            : typeof err === 'object' && err && 'message' in err
              ? (err as { message: string }).message
              : 'Registration failed',
        );
        setLoading(false);
        return;
      }
      const { error: signInError } = await authClient.signIn.email({
        email: result.data.email,
        password: result.data.password,
      });
      if (signInError) {
        setSubmitError('Account created but sign-in failed. Please log in.');
        setLoading(false);
        return;
      }
      window.location.href = '/onboarding';
    } catch {
      setSubmitError('Connection failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <AuthLayout config={config} title="Create your account" subtitle="Start tracking shipments in minutes">
      {submitError && <AuthAlert>{submitError}</AuthAlert>}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor="hp-field">Leave empty</label>
          <input
            id="hp-field"
            name="hp_verify"
            type="text"
            tabIndex={-1}
            autoComplete="new-password"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="reg-name" className="text-sm font-medium text-foreground/80">
            Full name
          </label>
          <input
            id="reg-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            autoComplete="name"
            className={`premium-input ${fieldErrors.name ? '!border-red-400' : ''}`}
          />
          {fieldErrors.name && <p className="text-xs text-red-500">{fieldErrors.name}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="reg-email" className="text-sm font-medium text-foreground/80">
            Email
          </label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            className={`premium-input ${fieldErrors.email ? '!border-red-400' : ''}`}
          />
          {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
        </div>

        <PasswordField
          id="reg-password"
          label="Password"
          value={password}
          onChange={setPassword}
          placeholder="Create a password (min. 8 characters)"
          autoComplete="new-password"
          error={fieldErrors.password}
        />

        <button type="submit" disabled={loading} className="premium-btn w-full disabled:opacity-60">
          {loading ? 'Creating account...' : 'Create account'}
        </button>

        <p className="text-center text-sm text-foreground/55">
          Already have an account?{' '}
          <a href="/login" className="font-semibold text-brand-accent hover:text-brand-accent-hover">
            Sign in
          </a>
        </p>

        <p className="text-center text-xs text-foreground/45">
          By creating an account, you agree to our{' '}
          <a href="/terms-conditions" className="text-foreground/60 hover:text-brand-accent">
            Terms of Service
          </a>
        </p>
      </form>
    </AuthLayout>
  );
}

function RegisterPageGuard(): ReactNode {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && session) router.replace('/');
  }, [session, isPending, router]);

  if (isPending) return null;
  if (session) return null;
  return <RegisterForm />;
}

export default function RegisterPage(): ReactNode {
  return (
    <ErrorBoundary>
      <RegisterPageGuard />
    </ErrorBoundary>
  );
}
