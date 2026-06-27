'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Button, InputGroup, TextField, Label, FieldError } from '@heroui/react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { ErrorBoundary } from '@/components/error-boundary';
import { AuthLayout } from '@/components/auth-layout';
import Link from 'next/link';
import { usePageTitle } from '@/lib/use-page-title';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FieldErrors = Partial<Record<keyof z.infer<typeof loginSchema>, string>>;

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  function validate() {
    const result = loginSchema.safeParse({ email, password });
    setFieldErrors(result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [i.path[0] as string, i.message])));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    if (honeypot) return;
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) { setFieldErrors(Object.fromEntries(result.error.issues.map((i) => [i.path[0] as string, i.message]))); return; }
    setFieldErrors({});
    setLoading(true);
    try {
      let twoFactorRedirected = false;
      const { error: signInError } = await authClient.signIn.email({ email, password }, {
        onSuccess(ctx) {
          if (ctx.data?.twoFactorRedirect) { twoFactorRedirected = true; window.location.href = '/2fa'; }
        },
      });
      if (signInError) setSubmitError(signInError.message || 'Invalid email or password');
      else if (!twoFactorRedirected) window.location.href = '/';
    } catch { setSubmitError('Connection failed. Check your network and try again.'); }
    finally { setLoading(false); }
  }

  return (
    <AuthLayout description="Multi-tenant logistics management for businesses across India and Sri Lanka. Track shipments, manage customers, and generate invoices — all in one place.">
      <div className="hidden lg:block mb-8">
        <h2 className="text-2xl font-semibold text-foreground tracking-tight">Welcome back</h2>
        <p className="text-sm text-muted mt-1">Sign in to your account to continue</p>
      </div>

      {submitError && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">{submitError}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor="hp-field">Leave empty</label>
          <input id="hp-field" name="website" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
        </div>

        <TextField fullWidth isInvalid={!!fieldErrors.email} name="email" type="email" value={email} onChange={(v) => { setEmail(v); if (fieldErrors.email) validate(); }}>
          <Label>Email</Label>
          <InputGroup fullWidth>
            <InputGroup.Prefix><Mail size={16} className="text-muted" /></InputGroup.Prefix>
            <InputGroup.Input placeholder="name@example.com" autoComplete="email" onBlur={validate} />
          </InputGroup>
          {fieldErrors.email && <FieldError>{fieldErrors.email}</FieldError>}
        </TextField>

        <TextField fullWidth isInvalid={!!fieldErrors.password} name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(v) => { setPassword(v); if (fieldErrors.password) validate(); }}>
          <Label>Password</Label>
          <InputGroup fullWidth>
            <InputGroup.Input placeholder="Enter your password" autoComplete="current-password" onBlur={validate} />
            <InputGroup.Suffix className="pr-0">
              <Button isIconOnly aria-label={showPassword ? 'Hide password' : 'Show password'} size="sm" variant="ghost" onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </InputGroup.Suffix>
          </InputGroup>
          {fieldErrors.password && <FieldError>{fieldErrors.password}</FieldError>}
        </TextField>

        <div className="flex justify-end -mt-2">
          <Link href="/forgot-password" className="text-xs text-muted hover:text-foreground underline underline-offset-2 transition-colors">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth isDisabled={loading} isLoading={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center"><span className="px-3 text-xs text-muted bg-background">or continue with</span></div>
      </div>

      <Button variant="secondary" fullWidth onPress={() => authClient.signIn.social({ provider: 'google', callbackURL: '/' })}>
        <svg className="mr-2 h-4 w-4 shrink-0" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Google
      </Button>

      <p className="mt-8 text-center text-xs text-muted">
        By signing in, you agree to our{' '}
        <a href="/privacy" className="text-foreground hover:text-accent underline underline-offset-2 transition-colors">Privacy Policy</a>
        {' '}and{' '}
        <a href="/terms" className="text-foreground hover:text-accent underline underline-offset-2 transition-colors">Terms of Service</a>
      </p>
    </AuthLayout>
  );
}

export default function LoginPage() {
  usePageTitle('Sign In');
  return (<ErrorBoundary><LoginForm /></ErrorBoundary>);
}
