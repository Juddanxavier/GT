'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, Input, InputOTP } from '@heroui/react';
import { authClient } from '@/lib/auth-client';
import { usePageTitle } from '@/lib/use-page-title';
import { ShieldAlert, RefreshCw } from 'lucide-react';
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
      {error && <div className="px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">{error}</div>}

      <form onSubmit={handleVerify} className="space-y-6">
        {mode === 'otp' ? (
          <div className="space-y-3">
            <InputOTP maxLength={6} value={code} onChange={(v) => { setCode(v); setError(''); }} pattern="^\d+$" className="justify-center">
              <InputOTP.Group>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTP.Slot key={i} index={i} className="border border-border rounded-xl" />
                ))}
              </InputOTP.Group>
            </InputOTP>
            {cooldown > 0 && <p className="text-center text-xs text-muted">Resend available in {cooldown}s</p>}
          </div>
        ) : (
          <Input
            placeholder="XXXX-XXXX-XX" value={code} onChange={(e) => { setCode(e.target.value); setError(''); }} autoFocus
            className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 rounded-xl text-center tracking-[0.2em] font-mono" />
        )}

        <Button type="submit" variant="secondary" isDisabled={code.length < 4} isPending={loading} fullWidth className="h-11">
          Verify
        </Button>
      </form>

      <div className="flex flex-col items-center gap-3 pt-1">
        {mode === 'otp' && (
          <Button size="sm" variant="ghost" isDisabled={cooldown > 0} onPress={sendCode} className="flex items-center gap-1.5 text-xs">
            <RefreshCw size={12} /> Resend code
          </Button>
        )}
        <button type="button" onClick={() => { setMode(mode === 'otp' ? 'backup' : 'otp'); setError(''); setCode(''); }}
          className="text-xs text-muted hover:text-foreground underline underline-offset-2 transition-colors">
          {mode === 'otp' ? 'Use a backup code instead' : 'Use email code instead'}
        </button>
      </div>
    </AuthLayout>
  );
}
