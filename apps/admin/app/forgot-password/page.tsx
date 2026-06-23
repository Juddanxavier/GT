'use client';

import { useState, useEffect, Suspense } from 'react';
import { Button, InputGroup, TextField, Label, FieldError } from '@heroui/react';
import { Mail, ArrowLeft, LoaderCircle, CheckCircle } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import Link from 'next/link';
import { usePageTitle } from '@/lib/use-page-title';
import { useRouter, useSearchParams } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');

  useEffect(() => {
    const urlEmail = searchParams.get('email');
    if (urlEmail && !email) setEmail(urlEmail);
  }, [searchParams, email]);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFieldError(null);

    if (!email) {
      setFieldError('Enter your email address');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || 'Failed to send reset code');
        return;
      }

      setSent(true);
      setTimeout(() => router.push(`/reset-password?email=${encodeURIComponent(email)}`), 1500);
    } catch {
      setError('Connection failed. Try again.');
    } finally {
      setLoading(false);
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
            Back to sign in
          </Link>

          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-3">
              <span className="text-emerald-400 text-xl font-bold tracking-tight">GT</span>
            </div>
          </div>

          {sent ? (
            <div className="mb-6 px-4 py-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 flex items-start gap-3">
              <CheckCircle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-emerald-300">Check your email</p>
                <p className="text-zinc-400 mt-1">
                  We sent a verification code to <span className="text-zinc-300">{email}</span>
                </p>
                <p className="text-zinc-500 mt-2">Redirecting to reset page...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-white tracking-tight">Forgot password</h2>
                <p className="text-sm text-zinc-500 mt-1">
                  Enter your email and we&apos;ll send you a code to reset it.
                </p>
              </div>

              {error && (
                <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleSendCode} className="space-y-5" noValidate>
                <TextField
                  fullWidth
                  isInvalid={!!fieldError}
                  name="email"
                  type="email"
                  value={email}
                  onChange={(v) => { setEmail(v); setFieldError(null); }}
                >
                  <Label>Email</Label>
                  <InputGroup fullWidth>
                    <InputGroup.Prefix>
                      <Mail size={16} className="text-muted" />
                    </InputGroup.Prefix>
                    <InputGroup.Input
                      placeholder="name@example.com"
                      autoComplete="email"
                    />
                  </InputGroup>
                  {fieldError && <FieldError>{fieldError}</FieldError>}
                </TextField>

                <Button type="submit" fullWidth isDisabled={loading}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoaderCircle size={16} className="animate-spin" />
                      Sending code...
                    </span>
                  ) : (
                    'Send reset code'
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  usePageTitle('Forgot Password');
  return (
    <ErrorBoundary>
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
    </ErrorBoundary>
  );
}
