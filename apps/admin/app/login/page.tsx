'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Button, Input, TextField, Label, FieldError } from '@heroui/react';
import { Eye, EyeOff } from 'lucide-react';
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    if (honeypot) return;
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) { setFieldErrors(Object.fromEntries(result.error.issues.map((i) => [i.path[0] as string, i.message]))); return; }
    setFieldErrors({});
    setLoading(true);
    try {
      const { error: signInError } = await authClient.signIn.email({ email, password });
      if (signInError) setSubmitError(signInError.message || 'Invalid email or password');
      else window.location.href = '/';
    } catch { setSubmitError('Connection failed. Check your network and try again.'); }
    finally { setLoading(false); }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your account to continue">
      {submitError && (
        <div className="px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">{submitError}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor="hp-field">Leave empty</label>
          <input id="hp-field" name="website" type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
        </div>

        <TextField fullWidth isInvalid={!!fieldErrors.email} name="email" type="email" value={email} onChange={(v) => setEmail(v)}>
          <Label>Email</Label>
          <Input placeholder="name@example.com" autoComplete="email" />
          {fieldErrors.email && <FieldError>{fieldErrors.email}</FieldError>}
        </TextField>

        <TextField fullWidth isInvalid={!!fieldErrors.password} name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(v) => setPassword(v)}>
          <Label>Password</Label>
          <div className="relative">
            <Input placeholder="Enter your password" autoComplete="current-password" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {fieldErrors.password && <FieldError>{fieldErrors.password}</FieldError>}
        </TextField>

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-muted hover:text-foreground underline underline-offset-2 transition-colors">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth isDisabled={loading} isLoading={loading} className="h-11">
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>

        <p className="text-center text-xs text-muted">
          By clicking Sign in, you agree to our{' '}
          <Link href="/terms" className="text-foreground hover:text-accent underline underline-offset-2 transition-colors">Terms of Service</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  usePageTitle('Sign In');
  return (<ErrorBoundary><LoginForm /></ErrorBoundary>);
}
