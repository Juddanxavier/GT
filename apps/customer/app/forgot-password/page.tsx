'use client';

import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { z } from 'zod';
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
        <div className="text-center space-y-5 animate-[fade-up_0.4s_ease-out]">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 border border-green-200 shadow-inner">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <p className="text-foreground/60 leading-relaxed">
            If an account exists with <strong className="text-foreground">{email}</strong>, you'll
            receive a password reset link shortly.
          </p>
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 font-medium text-brand-accent hover:text-brand-accent-hover transition-colors"
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
        <div className="space-y-2">
          <label htmlFor="forgot-email" className="font-medium text-foreground/80">
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
            className={`w-full px-4 py-2.5 bg-white border rounded-xl text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all ${fieldError ? 'border-red-400' : 'border-border'}`}
          />
          {fieldError && <p className="text-xs text-red-500">{fieldError}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-accent hover:bg-brand-accent-hover disabled:opacity-60 text-white font-semibold rounded-xl h-11 transition-all cursor-pointer"
        >
          {loading ? 'Sending...' : 'Send reset link'}
        </button>

        <p className="text-center">
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 font-medium text-brand-accent hover:text-brand-accent-hover transition-colors"
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
