'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, InputGroup, TextField, Label, FieldError } from '@heroui/react';
import { Lock, Eye, EyeOff, ArrowLeft, LoaderCircle, CheckCircle, KeyRound, SendHorizonal } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { ErrorBoundary } from '@/components/error-boundary';
import Link from 'next/link';
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

  useEffect(() => {
    if (!email) router.replace('/forgot-password');
  }, [email, router]);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!otp || otp.length < 4) {
      setFieldError('Enter the verification code from your email');
      return;
    }

    if (password.length < 8) {
      setFieldError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setFieldError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await authClient.emailOtp.resetPassword({
        email,
        otp,
        password,
      });

      if (resetError) {
        const msg =
          resetError.code === 'OTP_EXPIRED'
            ? 'This code has expired. Request a new one.'
            : resetError.code === 'INVALID_OTP'
              ? 'Invalid verification code. Check your email and try again.'
              : resetError.code === 'TOO_MANY_ATTEMPTS'
                ? 'Too many attempts. Request a new code.'
                : resetError.message || 'Failed to reset password';
        setError(msg);
        return;
      }

      setSuccess('Password reset successfully!');
      setTimeout(() => router.push('/login'), 2000);
    } catch {
      setError('Connection failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendCode() {
    setError('');
    setSendingCode(true);
    try {
      const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'forget-password',
      });
      if (sendError) {
        setError(sendError.message || 'Failed to send code');
      } else {
        setCodeSent(true);
      }
    } catch {
      setError('Connection failed. Try again.');
    } finally {
      setSendingCode(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col items-center justify-center bg-[#07070b] overflow-hidden p-12">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-emerald-500/8 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative z-10 text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <span className="text-emerald-400 text-3xl font-bold tracking-tight">GT</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Gajan Traders</h1>
          <p className="text-sm text-zinc-500 mt-2">Shipment Tracking Platform</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-[#0c0c12] px-6 py-12">
        <div className="w-full max-w-sm">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-8"
          >
            <ArrowLeft size={14} />
            Back
          </Link>

          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-3">
              <span className="text-emerald-400 text-xl font-bold tracking-tight">GT</span>
            </div>
          </div>

          {success ? (
            <div className="mb-6 px-4 py-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 flex items-start gap-3">
              <CheckCircle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-emerald-300">Password reset successfully!</p>
                <p className="text-zinc-400 mt-1">Redirecting to sign in...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
                  <KeyRound size={20} className="text-emerald-400" />
                </div>
                <h2 className="text-2xl font-semibold text-white tracking-tight">Set up your password</h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {codeSent ? (
                    <>Enter the code sent to <span className="text-zinc-300 font-medium">{email}</span></>
                  ) : (
                    <>Verify your email to set a password for <span className="text-zinc-300 font-medium">{email}</span></>
                  )}
                </p>
              </div>

              {error && (
                <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                  {error}
                </div>
              )}

              {!codeSent ? (
                <div className="space-y-5">
                  <p className="text-sm text-zinc-500">
                    We'll send a verification code to your email so you can set up your password.
                  </p>
                  <Button fullWidth onPress={handleSendCode} isDisabled={sendingCode}>
                    {sendingCode ? (
                      <span className="flex items-center justify-center gap-2">
                        <LoaderCircle size={16} className="animate-spin" />
                        Sending code...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <SendHorizonal size={16} />
                        Send verification code
                      </span>
                    )}
                  </Button>
                  {error && (
                    <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                      {error}
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-5" noValidate>
                  {/* OTP */}
                  <TextField
                    fullWidth
                    isInvalid={!!fieldError && !otp}
                    name="otp"
                    value={otp}
                    onChange={(v) => { setOtp(v); setFieldError(null); }}
                  >
                    <Label>Verification code</Label>
                    <InputGroup fullWidth>
                      <InputGroup.Input
                        placeholder="000000"
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        maxLength={6}
                      />
                    </InputGroup>
                    {fieldError && !password && <FieldError>{fieldError}</FieldError>}
                  </TextField>

                  {/* New password */}
                  <TextField
                    fullWidth
                    isInvalid={!!fieldError && password.length > 0 && password.length < 8}
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(v) => { setPassword(v); setFieldError(null); }}
                  >
                    <Label>New password</Label>
                    <InputGroup fullWidth>
                      <InputGroup.Prefix>
                        <Lock size={16} className="text-muted" />
                      </InputGroup.Prefix>
                      <InputGroup.Input
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                      />
                      <InputGroup.Suffix className="pr-0">
                        <Button
                          isIconOnly
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          size="sm"
                          variant="ghost"
                          onPress={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </Button>
                      </InputGroup.Suffix>
                    </InputGroup>
                    {fieldError && password.length > 0 && password.length < 8 && (
                      <FieldError>{fieldError}</FieldError>
                    )}
                  </TextField>

                  {/* Confirm password */}
                  <TextField
                    fullWidth
                    isInvalid={!!fieldError && confirmPassword.length > 0 && password !== confirmPassword}
                    name="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(v) => { setConfirmPassword(v); setFieldError(null); }}
                  >
                    <Label>Confirm password</Label>
                    <InputGroup fullWidth>
                      <InputGroup.Prefix>
                        <Lock size={16} className="text-muted" />
                      </InputGroup.Prefix>
                      <InputGroup.Input
                        placeholder="Re-enter your new password"
                        autoComplete="new-password"
                      />
                      <InputGroup.Suffix className="pr-0">
                        <Button
                          isIconOnly
                          aria-label={showConfirm ? 'Hide password' : 'Show password'}
                          size="sm"
                          variant="ghost"
                          onPress={() => setShowConfirm(!showConfirm)}
                        >
                          {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </Button>
                      </InputGroup.Suffix>
                    </InputGroup>
                    {fieldError && confirmPassword.length > 0 && password !== confirmPassword && (
                      <FieldError>{fieldError}</FieldError>
                    )}
                  </TextField>

                  <Button type="submit" fullWidth isDisabled={loading}>
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <LoaderCircle size={16} className="animate-spin" />
                        Setting password...
                      </span>
                    ) : (
                      'Set password'
                    )}
                  </Button>

                  <p className="text-center text-xs text-zinc-600">
                    Didn&apos;t get a code?{' '}
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={sendingCode}
                      className="text-zinc-400 hover:text-zinc-300 underline underline-offset-2 transition-colors"
                    >
                      {sendingCode ? 'Sending...' : 'Resend code'}
                    </button>
                  </p>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  usePageTitle('Reset Password');
  return (
    <ErrorBoundary>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </ErrorBoundary>
  );
}
