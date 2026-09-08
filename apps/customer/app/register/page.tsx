'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
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
  const [showPassword, setShowPassword] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE = '';

  async function handleSubmit() {
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
      const res = await fetch(`${API_BASE}/api/customers/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': 'gajan-traders',
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
    }
  }

  return (
    <AuthLayout
      config={config}
      title="Create your account"
      subtitle="Start tracking your shipments"
    >
      {submitError && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 mb-6">
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="shrink-0"
          >
            <circle cx="8" cy="8" r="7" />
            <path d="M8 5v3M8 10.5v.5" />
          </svg>
          {submitError}
        </div>
      )}

      <form className="space-y-5">
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
          <label htmlFor="reg-name" className="font-medium text-foreground/80">
            Full Name
          </label>
          <input
            id="reg-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            autoComplete="name"
            className={`w-full px-4 py-2.5 bg-white border rounded-xl text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all ${fieldErrors.name ? 'border-red-400' : 'border-border'}`}
          />
          {fieldErrors.name && <p className="text-xs text-red-500">{fieldErrors.name}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="reg-email" className="font-medium text-foreground/80">
            Email
          </label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            className={`w-full px-4 py-2.5 bg-white border rounded-xl text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all ${fieldErrors.email ? 'border-red-400' : 'border-border'}`}
          />
          {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="reg-password" className="font-medium text-foreground/80">
            Password
          </label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password (min. 8 characters)"
              autoComplete="new-password"
              className={`w-full px-4 py-2.5 bg-white border rounded-xl text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all ${fieldErrors.password ? 'border-red-400' : 'border-border'}`}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {fieldErrors.password && <p className="text-xs text-red-500">{fieldErrors.password}</p>}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-brand-accent hover:bg-brand-accent-hover disabled:opacity-60 text-white font-semibold rounded-xl h-11 transition-all cursor-pointer"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>

        <p className="text-center text-foreground/60">
          Already have an account?{' '}
          <a
            href="/login"
            className="font-semibold text-brand-accent hover:text-brand-accent-hover underline underline-offset-2 transition-colors"
          >
            Sign in
          </a>
        </p>

        <p className="text-center text-foreground/50">
          By creating an account, you agree to our{' '}
          <a
            href="/terms"
            className="text-foreground/60 hover:text-brand-accent underline underline-offset-2 transition-colors"
          >
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
