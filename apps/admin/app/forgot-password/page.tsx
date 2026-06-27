'use client';

import { useState, Suspense } from 'react';
import { Button, InputGroup, TextField, Label, FieldError } from '@heroui/react';
import { Mail, CheckCircle } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { AuthLayout } from '@/components/auth-layout';
import { usePageTitle } from '@/lib/use-page-title';
import { useRouter, useSearchParams } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setFieldError(null);
    if (!email) { setFieldError('Enter your email address'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ email }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); setError(b.error || 'Failed to send reset code'); return; }
      setSent(true);
      setTimeout(() => router.push(`/reset-password?email=${encodeURIComponent(email)}`), 1500);
    } catch { setError('Connection failed. Try again.'); }
    finally { setLoading(false); }
  }

  if (sent) {
    return (
      <AuthLayout backHref="/login" backLabel="Back to sign in">
        <div className="flex flex-col items-center gap-4 text-center pt-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-success/10 border border-success/20">
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
      {error && <div className="px-4 py-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">{error}</div>}

      <form onSubmit={handleSendCode} className="space-y-5" noValidate>
        <TextField fullWidth isInvalid={!!fieldError} name="email" type="email" value={email} onChange={(v) => setEmail(v)}>
          <Label>Email</Label>
          <InputGroup fullWidth>
            <InputGroup.Prefix><Mail size={16} className="text-muted" /></InputGroup.Prefix>
            <InputGroup.Input placeholder="name@example.com" autoComplete="email" />
          </InputGroup>
          {fieldError && <FieldError>{fieldError}</FieldError>}
        </TextField>

        <Button type="submit" fullWidth isDisabled={loading} isLoading={loading}>
          {loading ? 'Sending code...' : 'Send reset code'}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function ForgotPasswordPage() {
  usePageTitle('Forgot Password');
  return (<ErrorBoundary><Suspense><ForgotPasswordForm /></Suspense></ErrorBoundary>);
}
