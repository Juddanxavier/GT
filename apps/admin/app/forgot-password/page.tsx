'use client';

import { useState, Suspense } from 'react';
import { Button, Input, TextField, Label, FieldError } from '@heroui/react';
import { CheckCircle, Timer } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { ErrorBoundary } from '@/components/error-boundary';
import { AuthLayout } from '@/components/auth-layout';
import { usePageTitle } from '@/lib/use-page-title';
import { useRouter, useSearchParams } from 'next/navigation';

function friendlyError(msg: string) {
  if (!msg) return 'Something went wrong. Try again.';
  if (msg.includes('Too many requests')) return 'You have sent too many requests. Please wait a moment before trying again.';
  if (msg.includes('rate limit') || msg.includes('rate_limit')) return 'Please slow down. Try again in a few minutes.';
  return msg;
}

function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setFieldError(null);
    if (!email) { setFieldError('Enter your email address'); return; }
    setLoading(true);
    try {
      const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({ email, type: 'forget-password' });
      if (sendError) { setError(friendlyError(sendError.message)); setCooldown(30); return; }
      setSent(true);
      setTimeout(() => router.push(`/reset-password?email=${encodeURIComponent(email)}`), 1500);
    } catch { setError('Connection failed. Try again.'); }
    finally { setLoading(false); }
  }

  if (sent) {
    return (
      <AuthLayout backHref="/login" backLabel="Back to sign in">
        <div className="flex flex-col items-center gap-4 text-center pt-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-success/10 ring-1 ring-success/20">
            <CheckCircle size={28} className="text-success" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Check your email</p>
            <p className="text-xs text-muted">We sent a code to <span className="text-foreground font-medium">{email}</span></p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot password" subtitle="Enter your email and we'll send you a code to reset it." backHref="/login" backLabel="Back to sign in">
      {error && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">
          <Timer size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSendCode} className="space-y-6" noValidate>
        <TextField fullWidth isInvalid={!!fieldError} name="email" type="email" value={email} onChange={(v) => setEmail(v)}>
          <Label>Email</Label>
          <Input placeholder="name@example.com" autoComplete="email" className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 rounded-xl" />
          {fieldError && <FieldError>{fieldError}</FieldError>}
        </TextField>

        <Button type="submit" fullWidth isDisabled={loading || cooldown > 0} isLoading={loading} className="h-11">
          {cooldown > 0 ? `Wait ${cooldown}s` : loading ? 'Sending code...' : 'Send reset code'}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function ForgotPasswordPage() {
  usePageTitle('Forgot Password');
  return (<ErrorBoundary><Suspense><ForgotPasswordForm /></Suspense></ErrorBoundary>);
}
