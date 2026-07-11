'use client';

import type { ReactNode } from 'react';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Button, Input, InputGroup, Spinner, TextField, Label, FieldError } from '@heroui/react';
import { ErrorBoundary } from '@/components/error-boundary';
import { authClient } from '@/lib/auth-client';
import { AuthLayout } from '@/components/auth-layout';
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

  const isEmerald = config.theme === 'emerald';
  const btnClass = isEmerald ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-violet-600 hover:bg-violet-700';
  const accentText = isEmerald ? 'text-emerald-600' : 'text-violet-600';
  const successBg = isEmerald ? 'bg-emerald-50 border-emerald-200' : 'bg-violet-50 border-violet-200';
  const successIcon = isEmerald ? 'text-emerald-600' : 'text-violet-600';

  useEffect(() => {
    if (!token) {
      setSubmitError('Missing reset token. Please use the link from your email.');
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    if (!token) { setSubmitError('Invalid reset link'); return; }
    const result = resetSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      setFieldErrors(Object.fromEntries(result.error.issues.map((i) => [i.path[0] as string, i.message])));
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
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${successBg} shadow-inner`}>
            <CheckCircle2 size={32} className={successIcon} />
          </div>
          <p className="text-sm text-foreground">Redirecting you to sign in...</p>
          <a href="/login" className={`inline-flex items-center gap-1.5 text-sm font-medium ${accentText} hover:opacity-80 transition-opacity`}>
            Go to sign in
          </a>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout config={config} title="Set new password" subtitle="Enter your new password below">
      {submitError && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger mb-6">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><circle cx="8" cy="8" r="7"/><path d="M8 5v3M8 10.5v.5"/></svg>
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <TextField fullWidth isInvalid={!!fieldErrors.password} name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(v) => { setPassword(v); setFieldErrors((p) => ({ ...p, password: '' })); }}>
          <Label>New Password</Label>
          <InputGroup fullWidth>
            <InputGroup.Input placeholder="Enter new password" autoComplete="new-password" />
            <InputGroup.Suffix className="pr-0">
              <Button isIconOnly aria-label={showPassword ? 'Hide password' : 'Show password'} size="sm" variant="ghost" onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </InputGroup.Suffix>
          </InputGroup>
          {fieldErrors.password && <FieldError>{fieldErrors.password}</FieldError>}
        </TextField>

        <TextField fullWidth isInvalid={!!fieldErrors.confirmPassword} name="confirmPassword" type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(v) => { setConfirmPassword(v); setFieldErrors((p) => ({ ...p, confirmPassword: '' })); }}>
          <Label>Confirm Password</Label>
          <InputGroup fullWidth>
            <InputGroup.Input placeholder="Re-enter new password" autoComplete="new-password" />
            <InputGroup.Suffix className="pr-0">
              <Button isIconOnly aria-label={showConfirm ? 'Hide confirm' : 'Show confirm'} size="sm" variant="ghost" onPress={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </InputGroup.Suffix>
          </InputGroup>
          {fieldErrors.confirmPassword && <FieldError>{fieldErrors.confirmPassword}</FieldError>}
        </TextField>

        <Button type="submit" fullWidth isDisabled={loading || !token} isPending={loading} className={`text-white font-medium shadow-sm shadow-black/10 ${btnClass} h-11`}>
          {loading ? 'Resetting...' : 'Reset password'}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage(): ReactNode {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background"><Spinner size="lg" /></div>}>
        <ResetPasswordForm />
      </Suspense>
    </ErrorBoundary>
  );
}
