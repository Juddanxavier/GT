'use client';

import { Spinner } from '@heroui/react';
import { CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { Suspense, useEffect, useState } from 'react';
import { z } from 'zod';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    );
  }

  if (success) {
    return (
      <AuthLayout config={config} title="Password reset" subtitle="Your password has been updated">
        <div className="text-center space-y-5 animate-[fade-up_0.4s_ease-out]">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 border border-green-200 shadow-inner">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <p className="text-foreground">Redirecting you to sign in...</p>
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 font-medium text-brand-accent hover:text-brand-accent-hover transition-colors"
          >
            Go to sign in
          </a>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout config={config} title="Set new password" subtitle="Enter your new password below">
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
          <label htmlFor="reset-password" className="font-medium text-foreground/80">
            New Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="reset-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors((p) => ({ ...p, password: '' }));
              }}
              placeholder="Enter new password"
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

        <div className="space-y-2">
          <label htmlFor="reset-confirm" className="font-medium text-foreground/80">
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              id="reset-confirm"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setFieldErrors((p) => ({ ...p, confirmPassword: '' }));
              }}
              placeholder="Re-enter new password"
              autoComplete="new-password"
              className={`w-full px-4 py-2.5 bg-white border rounded-xl text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 transition-all ${fieldErrors.confirmPassword ? 'border-red-400' : 'border-border'}`}
            />
            <button
              type="button"
              aria-label={showConfirm ? 'Hide confirm' : 'Show confirm'}
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground transition-colors cursor-pointer"
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {fieldErrors.confirmPassword && (
            <p className="text-xs text-red-500">{fieldErrors.confirmPassword}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !token}
          className="w-full bg-brand-accent hover:bg-brand-accent-hover disabled:opacity-60 text-white font-semibold rounded-xl h-11 transition-all cursor-pointer"
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
          <div className="flex min-h-screen items-center justify-center bg-background">
            <Spinner size="lg" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </ErrorBoundary>
  );
}
