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
  const [terms, setTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    if (honeypot) return;
    if (!terms) { setSubmitError('You must agree to the Terms of Service'); return; }
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
          <InputGroup fullWidth>
            <InputGroup.Prefix><Mail size={16} className="text-muted" /></InputGroup.Prefix>
            <InputGroup.Input placeholder="name@example.com" autoComplete="email" className="border" />
          </InputGroup>
          {fieldErrors.email && <FieldError>{fieldErrors.email}</FieldError>}
        </TextField>

        <TextField fullWidth isInvalid={!!fieldErrors.password} name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(v) => setPassword(v)}>
          <Label>Password</Label>
          <InputGroup fullWidth>
            <InputGroup.Input placeholder="Enter your password" autoComplete="current-password" className="border" />
            <InputGroup.Suffix className="pr-0">
              <Button isIconOnly aria-label={showPassword ? 'Hide password' : 'Show password'} size="sm" variant="ghost" onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </InputGroup.Suffix>
          </InputGroup>
          {fieldErrors.password && <FieldError>{fieldErrors.password}</FieldError>}
        </TextField>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2.5 text-xs text-muted cursor-pointer select-none group">
            <div className={`relative w-4 h-4 rounded border ${terms ? 'bg-accent border-accent' : 'border-border bg-field-background'} transition-colors flex items-center justify-center`}>
              {terms && (
                <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
            <span className="group-hover:text-foreground transition-colors">I agree to the <Link href="/terms" className="text-foreground hover:text-accent underline underline-offset-2 transition-colors">Terms</Link></span>
          </label>
          <Link href="/forgot-password" className="text-xs text-muted hover:text-foreground underline underline-offset-2 transition-colors">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth isDisabled={loading} isLoading={loading} className="h-11">
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  usePageTitle('Sign In');
  return (<ErrorBoundary><LoginForm /></ErrorBoundary>);
}
