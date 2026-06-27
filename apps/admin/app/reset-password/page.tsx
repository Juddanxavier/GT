'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200">
            <Lock size={24} className="text-emerald-500" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900">Password reset successfully!</p>
            <p className="text-xs text-gray-500">Redirecting to sign in...</p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (!codeSent) {
    return (
      <AuthLayout title="Set up your password" subtitle={`Verify your email to set a password for ${email}`} backHref="/forgot-password" backLabel="Back">
        {error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}
        <button type="button" onClick={handleSendCode} disabled={sendingCode}
          className="w-full h-11 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {sendingCode && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
          {sendingCode ? 'Sending...' : 'Send verification code'}
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Enter verification code" subtitle={`Enter the code sent to ${email}`} backHref={`/forgot-password?email=${encodeURIComponent(email)}`} backLabel="Back">
      {error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}

      <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Verification code</label>
          <input type="text" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="000000" autoComplete="one-time-code" maxLength={6}
            className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 text-center tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors hover:border-gray-300" />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">New password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password"
              className="w-full h-11 pl-10 pr-10 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors hover:border-gray-300" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Confirm password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
            <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your new password" autoComplete="new-password"
              className="w-full h-11 pl-10 pr-10 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors hover:border-gray-300" />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full h-11 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {loading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
          {loading ? 'Setting password...' : 'Set password'}
        </button>

        <p className="text-center text-xs text-gray-500">
          Didn&apos;t get a code?{' '}
          <button type="button" onClick={handleSendCode} disabled={sendingCode}
            className="text-gray-900 hover:text-accent underline underline-offset-2 transition-colors">
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
