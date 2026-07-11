'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { z } from 'zod';
import { Button, Input, InputGroup, TextField, Label, FieldError } from '@heroui/react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Eye, EyeOff } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { AuthLayout } from '@/components/auth-layout';
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
  const [loading, setLoading] = useState(false);

  const isEmerald = config.theme === 'emerald';
  const btnClass = isEmerald ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-violet-600 hover:bg-violet-700';

  function friendlyError(msg: string): string {
    if (!msg) return 'Something went wrong. Try again.';
    if (msg.includes('Too many requests')) return 'Too many attempts. Please wait a moment.';
    if (msg.includes('Invalid email or password')) return 'The email or password you entered is incorrect.';
    return msg;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    if (honeypot) return;
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setFieldErrors(Object.fromEntries(result.error.issues.map((i) => [i.path[0] as string, i.message])));
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const { error: signInError } = await authClient.signIn.email({ email, password });
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

        <TextField fullWidth isInvalid={!!fieldErrors.email} name="email" type="email" value={email} onChange={(v) => setEmail(v)}>
          <Label>Email</Label>
          <Input placeholder="name@example.com" autoComplete="email" />
          {fieldErrors.email && <FieldError>{fieldErrors.email}</FieldError>}
        </TextField>

        <TextField fullWidth isInvalid={!!fieldErrors.password} name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(v) => setPassword(v)}>
          <Label>Password</Label>
          <InputGroup fullWidth>
            <InputGroup.Input placeholder="Enter your password" autoComplete="current-password" />
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

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
            <input type="checkbox" defaultChecked className="rounded border-border accent-current" />
            Remember me
          </label>
          <a href="/forgot-password" className="text-xs text-muted hover:text-foreground underline underline-offset-2 transition-colors">
            Forgot password?
          </a>
        </div>

        <Button type="submit" fullWidth isDisabled={loading} isPending={loading} className={`text-white font-medium shadow-sm shadow-black/10 ${btnClass} h-11`}>
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>

        <p className="text-center text-xs text-muted">
          No account?{' '}
          <a href="/register" className={`font-semibold underline underline-offset-2 transition-colors ${isEmerald ? 'text-emerald-600 hover:text-emerald-700' : 'text-violet-600 hover:text-violet-700'}`}>
            Create one
          </a>
        </p>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage(): ReactNode {
  return <ErrorBoundary><LoginForm /></ErrorBoundary>;
}
