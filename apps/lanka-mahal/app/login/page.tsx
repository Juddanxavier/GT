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

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FieldErrors = Partial<Record<keyof z.infer<typeof loginSchema>, string>>;

function LoginForm(): ReactNode {
  const config = useTenantConfig();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  function friendlyError(msg: string): string {
    if (!msg) return 'Something went wrong. Try again.';
    if (msg.includes('Too many requests')) return 'Too many attempts. Please wait a moment.';
    if (msg.includes('Invalid email or password'))
      return 'The email or password you entered is incorrect.';
    return msg;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    if (honeypot) return;
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setFieldErrors(
        Object.fromEntries(result.error.issues.map((i) => [i.path[0] as string, i.message])),
      );
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const { error: signInError } = await authClient.signIn.email({ email, password, rememberMe });
      if (signInError) setSubmitError(friendlyError(signInError.message || ''));
      else window.location.href = '/';
    } catch {
      setSubmitError('Connection failed. Check your network and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout config={config} title="Welcome back" subtitle="Sign in to track shipments and manage your account">
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
          <label htmlFor="login-email" className="text-sm font-medium text-foreground/80">
            Email
          </label>
          <input
            type="email"
            id="login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            className={`premium-input ${fieldErrors.email ? '!border-red-400' : ''}`}
          />
          {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
        </div>

        <PasswordField
          id="login-password"
          label="Password"
          value={password}
          onChange={setPassword}
          placeholder="Enter your password"
          autoComplete="current-password"
          error={fieldErrors.password}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-foreground/60">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-border accent-brand-accent"
            />
            Remember me
          </label>
          <a
            href="/forgot-password"
            className="text-sm font-medium text-brand-accent transition-colors hover:text-brand-accent-hover"
          >
            Forgot password?
          </a>
        </div>

        <button type="submit" disabled={loading} className="premium-btn w-full disabled:opacity-60">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <p className="text-center text-sm text-foreground/55">
          No account?{' '}
          <a href="/register" className="font-semibold text-brand-accent hover:text-brand-accent-hover">
            Create one
          </a>
        </p>
      </form>
    </AuthLayout>
  );
}

function LoginPageGuard(): ReactNode {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && session) router.replace('/');
  }, [session, isPending, router]);

  if (isPending) return null;
  if (session) return null;
  return <LoginForm />;
}

export default function LoginPage(): ReactNode {
  return (
    <ErrorBoundary>
      <LoginPageGuard />
    </ErrorBoundary>
  );
}
