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

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FieldErrors = Partial<Record<keyof z.infer<typeof loginSchema>, string>>;

function LoginForm(): ReactNode {
  const config = useTenantConfig();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <AuthLayout config={config} title="Welcome back" subtitle="Sign in to your account to continue">
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
          <label htmlFor="login-email" className="font-medium text-foreground/80">
            Email
          </label>
          <input
            type="email"
            id="login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            className={`w-full px-4 py-2.5 bg-white border rounded-xl text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all ${fieldErrors.email ? 'border-red-400' : 'border-border'}`}
          />
          {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="login-password" className="font-medium text-foreground/80">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
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

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-foreground/60 cursor-pointer select-none">
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
            className="text-foreground/60 hover:text-brand-accent underline underline-offset-2 transition-colors"
          >
            Forgot password?
          </a>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-accent hover:bg-brand-accent-hover disabled:opacity-60 text-white font-semibold rounded-xl h-11 transition-all cursor-pointer"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <p className="text-center text-foreground/60">
          No account?{' '}
          <a
            href="/register"
            className="font-semibold text-brand-accent hover:text-brand-accent-hover underline underline-offset-2 transition-colors"
          >
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
