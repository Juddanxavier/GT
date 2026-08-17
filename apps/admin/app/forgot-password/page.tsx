'use client';

import { useState, Suspense } from 'react';
import { Button, Input, TextField, Label, FieldError } from '@heroui/react';
import { CheckCircle } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { AuthLayout } from '@/components/auth-layout';
import { usePageTitle } from '@/lib/use-page-title';
import { useSearchParams } from 'next/navigation';

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setFieldError(null);
    if (!email) { setFieldError('Enter your email address'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirectTo: `${window.location.origin}/reset-password` }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong. Try again.'); return; }
      setSent(true);
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
            <p className="text-xs text-muted">We sent a reset link to <span className="text-foreground font-medium">{email}</span></p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot password" subtitle="Enter your email and we'll send you a reset link." backHref="/login" backLabel="Back to sign in">
      {error && (
        <div className="px-4 py-3 rounded-sm bg-danger/10 border border-danger/20 text-sm text-danger">{error}</div>
      )}

      <form onSubmit={handleSend} className="space-y-6" noValidate>
        <TextField fullWidth isInvalid={!!fieldError} name="email" type="email" value={email} onChange={(v) => setEmail(v)}>
          <Label>Email</Label>
          <Input placeholder="name@example.com" autoComplete="email" className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 rounded-sm" />
          {fieldError && <FieldError>{fieldError}</FieldError>}
        </TextField>

        <Button type="submit" fullWidth isDisabled={loading} isPending={loading} className="h-11">
          {loading ? 'Sending...' : 'Send reset link'}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function ForgotPasswordPage() {
  usePageTitle('Forgot Password');
  return (<ErrorBoundary><Suspense><ForgotPasswordForm /></Suspense></ErrorBoundary>);
}
