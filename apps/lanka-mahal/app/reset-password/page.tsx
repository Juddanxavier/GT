'use client';

import { Spinner } from '@heroui/react';
import { CheckCircle2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { Suspense, useEffect, useState } from 'react';
import { z } from 'zod';
import { AuthAlert } from '@/components/auth/auth-alert';
import { PasswordField } from '@/components/auth/password-field';
import { AuthLayout } from '@/components/auth-layout';
import { ErrorBoundary } from '@/components/error-boundary';
import { authClient } from '@/lib/auth-client';
import { useTenantConfig } from '@/lib/use-tenant-config';

const resetSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FieldErrors = Partial<Record<'password' | 'confirmPassword', string>>;

function ResetPasswordForm(): ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const config = useTenantConfig();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setSubmitError('Missing reset token. Please use the link from your email.');
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    if (!token) {
      setSubmitError('Invalid reset link');
      return;
    }
    const result = resetSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      setFieldErrors(
        Object.fromEntries(result.error.issues.map((i) => [i.path[0] as string, i.message])),
      );
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: result.data.password,
        token,
      });
      if (resetError) {
        setSubmitError(resetError.message || 'Failed to reset password');
      } else {
        setSuccess(true);
        setTimeout(() => router.push('/login'), 3000);
      }
    } catch {
      setSubmitError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!token && !submitError) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-brand-cream">
        <Spinner size="lg" />
      </div>
    );
  }

  if (success) {
    return (
      <AuthLayout config={config} title="Password reset" subtitle="Your password has been updated">
        <div className="space-y-5 text-center animate-[fade-up_0.4s_ease-out]">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-green-200 bg-green-50">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <p className="text-sm text-foreground/70">Redirecting you to sign in...</p>
          <a href="/login" className="text-sm font-semibold text-brand-accent hover:text-brand-accent-hover">
            Go to sign in
          </a>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout config={config} title="Set new password" subtitle="Enter your new password below">
      {submitError && <AuthAlert>{submitError}</AuthAlert>}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <PasswordField
          id="reset-password"
          label="New password"
          value={password}
          onChange={(v) => {
            setPassword(v);
            setFieldErrors((p) => ({ ...p, password: '' }));
          }}
          placeholder="Enter new password"
          autoComplete="new-password"
          error={fieldErrors.password}
        />

        <PasswordField
          id="reset-confirm"
          label="Confirm password"
          value={confirmPassword}
          onChange={(v) => {
            setConfirmPassword(v);
            setFieldErrors((p) => ({ ...p, confirmPassword: '' }));
          }}
          placeholder="Re-enter new password"
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
        />

        <button
          type="submit"
          disabled={loading || !token}
          className="premium-btn w-full disabled:opacity-60"
        >
          {loading ? 'Resetting...' : 'Reset password'}
        </button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage(): ReactNode {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="flex min-h-[100svh] items-center justify-center bg-brand-cream">
            <Spinner size="lg" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </ErrorBoundary>
  );
}
