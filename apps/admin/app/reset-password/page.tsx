'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input, TextField, Label } from '@heroui/react';
import { authClient } from '@/lib/auth-client';
import { ErrorBoundary } from '@/components/error-boundary';
import { AuthLayout } from '@/components/auth-layout';
import { usePageTitle } from '@/lib/use-page-title';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  useEffect(() => { if (!email) router.replace('/forgot-password'); }, [email, router]);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!otp || otp.length < 4) { setError('Enter the verification code from your email'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const { error: resetError } = await authClient.emailOtp.resetPassword({ email, otp, password });
      if (resetError) {
        setError(resetError.code === 'OTP_EXPIRED' ? 'This code has expired. Request a new one.'
          : resetError.code === 'INVALID_OTP' ? 'Invalid verification code. Check your email and try again.'
          : resetError.code === 'TOO_MANY_ATTEMPTS' ? 'Too many attempts. Request a new code.'
          : resetError.message || 'Failed to reset password');
        return;
      }
      setSuccess('Password reset successfully!');
      setTimeout(() => router.push('/login'), 2000);
    } catch { setError('Connection failed. Try again.'); }
    finally { setLoading(false); }
  }

  async function handleSendCode() {
    setError(''); setSendingCode(true);
    try {
      const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({ email, type: 'forget-password' });
      if (sendError) { setError(sendError.message || 'Failed to send code'); }
      else { setCodeSent(true); }
    } catch { setError('Connection failed. Try again.'); }
    finally { setSendingCode(false); }
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

  if (!codeSent) {
    return (
      <AuthLayout title="Set up your password" subtitle={`Verify your email to set a password for ${email}`} backHref="/forgot-password" backLabel="Back">
        {error && <div className="px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">{error}</div>}
        <Button fullWidth onPress={handleSendCode} isDisabled={sendingCode} isLoading={sendingCode} className="h-11">
          Send verification code
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Enter verification code" subtitle={`Enter the code sent to ${email}`} backHref={`/forgot-password?email=${encodeURIComponent(email)}`} backLabel="Back">
      {error && <div className="px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">{error}</div>}

      <form onSubmit={handleResetPassword} className="space-y-5" noValidate>
        <TextField fullWidth name="otp" value={otp} onChange={(v) => setOtp(v)}>
          <Label>Verification code</Label>
          <Input placeholder="000000" autoComplete="one-time-code" inputMode="numeric" maxLength={6} className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 rounded-xl" />
        </TextField>

        <TextField fullWidth name="password" type="password" value={password} onChange={(v) => setPassword(v)}>
          <Label>New password</Label>
          <Input placeholder="At least 8 characters" autoComplete="new-password" className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 rounded-xl" />
        </TextField>

        <TextField fullWidth name="confirmPassword" type="password" value={confirmPassword} onChange={(v) => setConfirmPassword(v)}>
          <Label>Confirm password</Label>
          <Input placeholder="Re-enter your new password" autoComplete="new-password" className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 rounded-xl" />
        </TextField>

        <Button type="submit" fullWidth isDisabled={loading} isLoading={loading} className="h-11">
          {loading ? 'Setting password...' : 'Set password'}
        </Button>

        <p className="text-center text-xs text-muted">
          Didn&apos;t get a code?{' '}
          <button type="button" onClick={handleSendCode} disabled={sendingCode}
            className="text-foreground hover:text-accent underline underline-offset-2 transition-colors">
            {sendingCode ? 'Sending...' : 'Resend code'}
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  usePageTitle('Reset Password');
  return (<ErrorBoundary><Suspense><ResetPasswordForm /></Suspense></ErrorBoundary>);
}
