'use client';

import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { z } from 'zod';
import { AuthAlert } from '@/components/auth/auth-alert';
import { AuthLayout } from '@/components/auth-layout';
import { ErrorBoundary } from '@/components/error-boundary';
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    setFieldError('');
    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      setFieldError(result.error.issues[0]?.message || 'Invalid email');
      return;
    }
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
        <div className="space-y-5 text-center animate-[fade-up_0.4s_ease-out]">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-green-200 bg-green-50">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <p className="text-sm leading-relaxed text-foreground/60">
            If an account exists with <strong className="text-foreground">{email}</strong>, you'll
            receive a password reset link shortly.
          </p>
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-accent hover:text-brand-accent-hover"
          >
            <ArrowLeft size={14} /> Back to sign in
          </a>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      config={config}
      title="Forgot password?"
      subtitle="Enter your email and we'll send you a reset link"
    >
      {submitError && <AuthAlert>{submitError}</AuthAlert>}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="space-y-2">
          <label htmlFor="forgot-email" className="text-sm font-medium text-foreground/80">
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldError('');
            }}
            placeholder="name@example.com"
            autoComplete="email"
            className={`premium-input ${fieldError ? '!border-red-400' : ''}`}
          />
          {fieldError && <p className="text-xs text-red-500">{fieldError}</p>}
        </div>

        <button type="submit" disabled={loading} className="premium-btn w-full disabled:opacity-60">
          {loading ? 'Sending...' : 'Send reset link'}
        </button>

        <p className="text-center">
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-accent hover:text-brand-accent-hover"
          >
            <ArrowLeft size={14} /> Back to sign in
          </a>
        </p>
      </form>
    </AuthLayout>
  );
}

export default function ForgotPasswordPage(): ReactNode {
  return (
    <ErrorBoundary>
      <ForgotPasswordForm />
    </ErrorBoundary>
  );
}
