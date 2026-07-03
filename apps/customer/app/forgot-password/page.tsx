'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button, Input, TextField, Label, FieldError } from '@heroui/react';
import { ErrorBoundary } from '@/components/error-boundary';
import { AuthLayout } from '@/components/auth-layout';
import { useTenantConfig } from '@/lib/use-tenant-config';

const emailSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

function ForgotPasswordForm(): ReactNode {
  const config = useTenantConfig();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const isEmerald = config.theme === 'emerald';
  const accentText = isEmerald ? 'text-emerald-600' : 'text-violet-600';
  const btnClass = isEmerald ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-violet-600 hover:bg-violet-700';
  const successBg = isEmerald ? 'bg-emerald-50 border-emerald-200' : 'bg-violet-50 border-violet-200';
  const successIcon = isEmerald ? 'text-emerald-600' : 'text-violet-600';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    setFieldError('');
    const result = emailSchema.safeParse({ email });
    if (!result.success) { setFieldError(result.error.issues[0]?.message || 'Invalid email'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirectTo: `${window.location.origin}/reset-password` }),
      });
      const body = await res.json();
      if (!res.ok) {
        setSubmitError((body as { error?: string }).error || 'Failed to send reset email');
      } else {
        setSent(true);
      }
    } catch {
      setSubmitError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout config={config} title="Check your email" subtitle="We've sent you a reset link">
        <div className="text-center space-y-5 animate-[fade-up_0.4s_ease-out]">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${successBg} shadow-inner`}>
            <CheckCircle2 size={32} className={successIcon} />
          </div>
          <p className="text-sm text-muted leading-relaxed">
            If an account exists with <strong className="text-foreground">{email}</strong>, you'll receive a password reset link shortly.
          </p>
          <a href="/login" className={`inline-flex items-center gap-1.5 text-sm font-medium ${accentText} hover:opacity-80 transition-opacity`}>
            <ArrowLeft size={14} /> Back to sign in
          </a>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout config={config} title="Forgot password?" subtitle="Enter your email and we'll send you a reset link">
      {submitError && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger mb-6">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><circle cx="8" cy="8" r="7"/><path d="M8 5v3M8 10.5v.5"/></svg>
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <p className="text-xs text-muted/80 -mb-2">Enter the email address associated with your account.</p>
        <TextField fullWidth isInvalid={!!fieldError} name="email" type="email" value={email} onChange={(v) => { setEmail(v); setFieldError(''); }}>
          <Label>Email</Label>
          <Input placeholder="name@example.com" autoComplete="email" />
          {fieldError && <FieldError>{fieldError}</FieldError>}
        </TextField>

        <Button type="submit" fullWidth isDisabled={loading} isPending={loading} className={`text-white font-medium shadow-sm shadow-black/10 ${btnClass} h-11`}>
          {loading ? 'Sending...' : 'Send reset link'}
        </Button>

        <p className="text-center">
          <a href="/login" className={`inline-flex items-center gap-1.5 text-xs font-medium ${accentText} hover:opacity-80 transition-opacity`}>
            <ArrowLeft size={14} /> Back to sign in
          </a>
        </p>
      </form>
    </AuthLayout>
  );
}

export default function ForgotPasswordPage(): ReactNode {
  return <ErrorBoundary><ForgotPasswordForm /></ErrorBoundary>;
}
