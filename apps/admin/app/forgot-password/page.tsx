'use client';

import { useState, Suspense } from 'react';
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
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200">
            <CheckCircle size={28} className="text-emerald-500" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-900">Check your email</p>
            <p className="text-xs text-gray-500">We sent a code to <span className="text-gray-700 font-medium">{email}</span></p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot password" subtitle="Enter your email and we'll send you a code to reset it." backHref="/login" backLabel="Back to sign in">
      {error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}

      <form onSubmit={handleSendCode} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email"
              className={`w-full h-11 pl-10 pr-4 rounded-xl border bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors ${fieldError ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`} />
          </div>
          {fieldError && <p className="text-xs text-red-500">{fieldError}</p>}
        </div>

        <button type="submit" disabled={loading}
          className="w-full h-11 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {loading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
          {loading ? 'Sending code...' : 'Send reset code'}
        </button>
      </form>
    </AuthLayout>
  );
}

export default function ForgotPasswordPage() {
  usePageTitle('Forgot Password');
  return (<ErrorBoundary><Suspense><ForgotPasswordForm /></Suspense></ErrorBoundary>);
}
