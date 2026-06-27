'use client';

import { useState, useEffect, useRef } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { usePageTitle } from '@/lib/use-page-title';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/auth-layout';

export default function TwoFactorPage() {
  usePageTitle('Two-Factor Verification');
  const router = useRouter();
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'otp' | 'backup'>('otp');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    sendCode();
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) { if (timer.current) clearInterval(timer.current); return; }
    timer.current = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [cooldown]);

  async function sendCode() {
    setError('');
    const res = await authClient.twoFactor.sendOtp();
    if (res.error) { setError(res.error.message || 'Failed to send code'); return; }
    setCooldown(30);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const fn = mode === 'otp' ? authClient.twoFactor.verifyOtp : authClient.twoFactor.verifyBackupCode;
      const { error: verifyError } = await fn({ code, trustDevice: true });
      if (verifyError) { setError(verifyError.message || 'Invalid code'); return; }
      router.push('/');
    } catch { setError('Verification failed. Try again.'); }
    finally { setLoading(false); }
  }

  return (
    <AuthLayout title="Two-factor authentication" subtitle={mode === 'otp' ? 'A verification code has been sent to your email' : 'Enter one of your backup codes'}>
      {error && <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}

      <form onSubmit={handleVerify} className="space-y-5">
        {mode === 'otp' ? (
          <div className="space-y-3">
            <div className="flex gap-2 justify-center">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <input key={i} type="text" inputMode="numeric" maxLength={1}
                  value={code[i] || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (!val && code[i]) {
                      setCode(code.slice(0, i) + code.slice(i + 1));
                      const prev = document.querySelector<HTMLInputElement>(`[data-otp="${i - 1}"]`);
                      prev?.focus();
                      return;
                    }
                    const newCode = code.slice(0, i) + (val.slice(0, 1) || '') + code.slice(i + 1);
                    const next = document.querySelector<HTMLInputElement>(`[data-otp="${i + 1}"]`);
                    if (val && next) next.focus();
                    setCode(newCode);
                    setError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !code[i] && i > 0) {
                      const prev = document.querySelector<HTMLInputElement>(`[data-otp="${i - 1}"]`);
                      prev?.focus();
                    }
                  }}
                  data-otp={i}
                  className="w-11 h-12 rounded-xl border border-gray-200 bg-white text-center text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors hover:border-gray-300"
                />
              ))}
            </div>
            {cooldown > 0 && <p className="text-center text-xs text-gray-500">Resend available in {cooldown}s</p>}
          </div>
        ) : (
          <input placeholder="XXXX-XXXX-XX" value={code} onChange={(e) => { setCode(e.target.value); setError(''); }} autoFocus
            className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 text-center tracking-[0.2em] font-mono focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors hover:border-gray-300" />
        )}

        <button type="submit" disabled={code.length < 4 || loading}
          className="w-full h-11 rounded-xl bg-accent hover:bg-accent/90 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {loading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </form>

      <div className="flex flex-col items-center gap-3 pt-1">
        {mode === 'otp' && (
          <button type="button" onClick={sendCode} disabled={cooldown > 0}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-40">
            <RefreshCw size={12} /> Resend code
          </button>
        )}
        <button type="button" onClick={() => { setMode(mode === 'otp' ? 'backup' : 'otp'); setError(''); setCode(''); }}
          className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-2 transition-colors">
          {mode === 'otp' ? 'Use a backup code instead' : 'Use email code instead'}
        </button>
      </div>
    </AuthLayout>
  );
}
