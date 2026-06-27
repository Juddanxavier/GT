'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input, TextField, Label } from '@heroui/react';
import { Lock, AlertTriangle } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { ErrorBoundary } from '@/components/error-boundary';
import { AuthLayout } from '@/components/auth-layout';
import { usePageTitle } from '@/lib/use-page-title';

function friendlyError(msg: string) {
  if (!msg) return 'Something went wrong. Try again.';
  if (msg.includes('Too many requests')) return 'You have sent too many requests. Please wait a moment before trying again.';
  if (msg.includes('invalid') || msg.includes('expired')) return 'This reset link is invalid or has expired. Please request a new one.';
  return msg;
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const { error: resetError } = await authClient.resetPassword({ newPassword: password, token: token! });
      if (resetError) { setError(friendlyError(resetError.message ?? '')); return; }
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch { setError('Connection failed. Try again.'); }
    finally { setLoading(false); }
  }

  if (!token) {
    return (
      <AuthLayout backHref="/login" backLabel="Back to sign in">
        <div className="flex flex-col items-center gap-4 text-center pt-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-warning/10 ring-1 ring-warning/20">
            <AlertTriangle size={28} className="text-warning" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Invalid or expired reset link</p>
            <p className="text-xs text-muted">This link is invalid or has expired. Request a new one.</p>
          </div>
          <Button onPress={() => router.push('/forgot-password')} className="mt-2">Request new link</Button>
        </div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout backHref="/login" backLabel="Back to sign in">
        <div className="flex flex-col items-center gap-4 text-center pt-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-success/10 ring-1 ring-success/20">
            <Lock size={24} className="text-success" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Password reset successfully!</p>
            <p className="text-xs text-muted">Redirecting to sign in...</p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set new password" subtitle="Enter your new password below." backHref="/login" backLabel="Back to sign in">
      {error && <div className="px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">{error}</div>}

      <form onSubmit={handleReset} className="space-y-5" noValidate>
        <TextField fullWidth name="password" type="password" value={password} onChange={(v) => setPassword(v)}>
          <Label>New password</Label>
          <Input placeholder="At least 8 characters" autoComplete="new-password" className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 rounded-xl" />
        </TextField>

        <TextField fullWidth name="confirmPassword" type="password" value={confirmPassword} onChange={(v) => setConfirmPassword(v)}>
          <Label>Confirm password</Label>
          <Input placeholder="Re-enter your new password" autoComplete="new-password" className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 rounded-xl" />
        </TextField>

        <Button type="submit" fullWidth isDisabled={loading} isPending={loading} className="h-11">
          {loading ? 'Resetting...' : 'Reset password'}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  usePageTitle('Reset Password');
  return (<ErrorBoundary><Suspense><ResetPasswordForm /></Suspense></ErrorBoundary>);
}
