'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, InputGroup, TextField, Label, FieldError } from '@heroui/react';
import { Lock, Eye, EyeOff, CheckCircle, KeyRound, SendHorizonal } from 'lucide-react';
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
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => { if (!email) router.replace('/forgot-password'); }, [email, router]);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!otp || otp.length < 4) { setFieldError('Enter the verification code from your email'); return; }
    if (password.length < 8) { setFieldError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setFieldError('Passwords do not match'); return; }
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

  return (
    <AuthLayout backHref={codeSent ? `/forgot-password?email=${encodeURIComponent(email)}` : '/login'} backLabel={codeSent ? 'Back' : 'Back'}>
      {success ? (
        <div className="mb-6 px-4 py-4 rounded-lg bg-success/10 border border-success/20 text-sm text-success flex items-start gap-3">
          <CheckCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Password reset successfully!</p>
            <p className="text-muted mt-1">Redirecting to sign in...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 mb-4">
              <KeyRound size={20} className="text-accent" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">Set up your password</h2>
            <p className="text-sm text-muted mt-1">
              {codeSent ? <>Enter the code sent to <span className="text-foreground font-medium">{email}</span></>
              : <>Verify your email to set a password for <span className="text-foreground font-medium">{email}</span></>}
            </p>
          </div>

          {error && <div className="mb-6 px-4 py-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">{error}</div>}

          {!codeSent ? (
            <div className="space-y-5">
              <p className="text-sm text-muted">We&apos;ll send a verification code to your email so you can set up your password.</p>
              <Button fullWidth onPress={handleSendCode} isDisabled={sendingCode} isLoading={sendingCode}>
                <SendHorizonal size={16} />
                Send verification code
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5" noValidate>
              <TextField fullWidth isInvalid={!!fieldError && !otp} name="otp" value={otp} onChange={(v) => { setOtp(v); setFieldError(null); }}>
                <Label>Verification code</Label>
                <InputGroup fullWidth>
                  <InputGroup.Input placeholder="000000" autoComplete="one-time-code" inputMode="numeric" maxLength={6} />
                </InputGroup>
                {fieldError && !password && <FieldError>{fieldError}</FieldError>}
              </TextField>

              <TextField fullWidth isInvalid={!!fieldError && password.length > 0 && password.length < 8}
                name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(v) => { setPassword(v); setFieldError(null); }}>
                <Label>New password</Label>
                <InputGroup fullWidth>
                  <InputGroup.Prefix><Lock size={16} className="text-muted" /></InputGroup.Prefix>
                  <InputGroup.Input placeholder="At least 8 characters" autoComplete="new-password" />
                  <InputGroup.Suffix className="pr-0">
                    <Button isIconOnly aria-label={showPassword ? 'Hide password' : 'Show password'} size="sm" variant="ghost" onPress={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  </InputGroup.Suffix>
                </InputGroup>
                {fieldError && password.length > 0 && password.length < 8 && <FieldError>{fieldError}</FieldError>}
              </TextField>

              <TextField fullWidth isInvalid={!!fieldError && confirmPassword.length > 0 && password !== confirmPassword}
                name="confirmPassword" type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(v) => { setConfirmPassword(v); setFieldError(null); }}>
                <Label>Confirm password</Label>
                <InputGroup fullWidth>
                  <InputGroup.Prefix><Lock size={16} className="text-muted" /></InputGroup.Prefix>
                  <InputGroup.Input placeholder="Re-enter your new password" autoComplete="new-password" />
                  <InputGroup.Suffix className="pr-0">
                    <Button isIconOnly aria-label={showConfirm ? 'Hide password' : 'Show password'} size="sm" variant="ghost" onPress={() => setShowConfirm(!showConfirm)}>
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  </InputGroup.Suffix>
                </InputGroup>
                {fieldError && confirmPassword.length > 0 && password !== confirmPassword && <FieldError>{fieldError}</FieldError>}
              </TextField>

              <Button type="submit" fullWidth isDisabled={loading} isLoading={loading}>
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
          )}
        </>
      )}
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  usePageTitle('Reset Password');
  return (<ErrorBoundary><Suspense><ResetPasswordForm /></Suspense></ErrorBoundary>);
}
