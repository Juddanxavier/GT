'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, Card, InputOTP } from '@heroui/react';
import { authClient } from '@/lib/auth-client';
import { usePageTitle } from '@/lib/use-page-title';
import { ShieldAlert, ArrowLeft, Check, RefreshCw, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TwoFactorPage() {
  usePageTitle('Two-Factor Verification');
  const router = useRouter();

  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'otp' | 'backup'>('otp');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
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
    setSent(false);
    console.log('[2fa] sending OTP...');
    const res = await authClient.twoFactor.sendOtp();
    console.log('[2fa] sendOtp response:', res);
    if (res.error) { setError(res.error.message || 'Failed to send code'); return; }
    setSent(true);
    setCooldown(30);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fn = mode === 'otp'
        ? authClient.twoFactor.verifyOtp
        : authClient.twoFactor.verifyBackupCode;
      const { error: verifyError } = await fn({ code, trustDevice: true });
      if (verifyError) { setError(verifyError.message || 'Invalid code'); return; }
      router.push('/');
    } catch {
      setError('Verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <Card.Content className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 mx-auto">
              <ShieldAlert size={24} className="text-accent" />
            </div>
            <h1 className="text-lg font-semibold">Two-Factor Authentication</h1>
            {mode === 'otp' ? (
              <>
                <p className="text-sm text-muted flex items-center justify-center gap-1.5">
                  <Mail size={13} />
                  {sent ? 'A verification code has been sent to your email' : 'Sending a verification code to your email...'}
                </p>
                {cooldown > 0 && <p className="text-xs text-muted">Resend available in {cooldown}s</p>}
              </>
            ) : (
              <p className="text-sm text-muted">Enter one of your backup codes</p>
            )}
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            {mode === 'otp' ? (
              <div className="space-y-1.5">
                <label className="text-xs text-muted mb-1 block text-center">Verification Code</label>
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(v) => { setCode(v); setError(''); }}
                  pattern="^\d+$"
                  className="justify-center"
                >
                  <InputOTP.Group>
                    <InputOTP.Slot index={0} className="border border-border rounded-md" />
                    <InputOTP.Slot index={1} className="border border-border rounded-md" />
                    <InputOTP.Slot index={2} className="border border-border rounded-md" />
                    <InputOTP.Slot index={3} className="border border-border rounded-md" />
                    <InputOTP.Slot index={4} className="border border-border rounded-md" />
                    <InputOTP.Slot index={5} className="border border-border rounded-md" />
                  </InputOTP.Group>
                </InputOTP>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs text-muted mb-1 block">Backup Code</label>
                <input
                  className="w-full h-9 px-3 rounded-lg bg-muted/10 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="XXXX-XXXX-XX"
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setError(''); }}
                  autoFocus
                />
              </div>
            )}

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
                <ShieldAlert size={12} />
                {error}
              </div>
            )}

            <Button type="submit" variant="secondary" isDisabled={code.length < 4} isPending={loading} fullWidth>
              {loading ? null : <Check size={15} />}
              Verify
            </Button>
          </form>

          <div className="flex flex-col items-center gap-3">
            {mode === 'otp' && (
              <Button size="sm" variant="ghost" isDisabled={cooldown > 0} onPress={sendCode} className="flex items-center gap-1.5 text-xs">
                <RefreshCw size={12} />
                Resend code
              </Button>
            )}
            <button
              type="button"
              onClick={() => { setMode(mode === 'otp' ? 'backup' : 'otp'); setError(''); setCode(''); }}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft size={12} />
              {mode === 'otp' ? 'Use a backup code instead' : 'Use email code instead'}
            </button>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
