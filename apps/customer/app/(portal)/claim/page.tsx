'use client';

import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, RefreshCw, Truck } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { PageHero } from '@/components/page/page-hero';
import { PageShell } from '@/components/page/page-section';

type Step = 'enter-tracking' | 'verify-otp' | 'success';

interface ShipmentData {
  trackingNo: string;
  status: string;
  carrier: string | null;
  message?: string;
}

export default function ClaimShipmentPage(): ReactNode {
  const [step, setStep] = useState<Step>('enter-tracking');
  const [trackingNo, setTrackingNo] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('trackingNo') ?? '';
    }
    return '';
  });
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [claimed, setClaimed] = useState<ShipmentData | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    if (trackingNo && step === 'enter-tracking') {
      initiateClaim.mutate(trackingNo);
    }
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  const initiateClaim = useMutation({
    mutationFn: async (tracking: string) => {
      const res = await fetch(`/api/track/claim/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ trackingNo: tracking }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to initiate claim');
      return data as { message: string; email: string };
    },
    onSuccess: (data) => {
      setEmail(data.email);
      setStep('verify-otp');
      setError('');
    },
    onError: (e: Error) => setError(e.message),
  });

  const verifyClaim = useMutation({
    mutationFn: async ({ tracking, code }: { tracking: string; code: string }) => {
      const res = await fetch(`/api/track/claim/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ trackingNo: tracking, otpCode: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Invalid or expired OTP');
      return data.data as ShipmentData;
    },
    onSuccess: (data) => {
      setClaimed(data);
      setStep('success');
      setError('');
    },
    onError: (e: Error) => setError(e.message),
  });

  const resendClaim = useMutation({
    mutationFn: async (tracking: string) => {
      const res = await fetch(`/api/track/claim/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ trackingNo: tracking }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to resend OTP');
      return data as { message: string; email: string };
    },
    onSuccess: () => {
      setError('');
      setResendTimer(30);
    },
    onError: (e: Error) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (step === 'enter-tracking') initiateClaim.mutate(trackingNo);
    if (step === 'verify-otp') verifyClaim.mutate({ tracking: trackingNo, code: otp });
  };

  return (
    <PageShell>
      <PageHero
        image="/images/about.webp"
        eyebrow="Claim Shipment"
        title="Claim Your Shipment"
        subtitle="Link a tracking number to your account with a quick email verification."
      />

      <div className="mx-auto max-w-xl px-5 py-10 sm:px-8">
        {step === 'success' ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <CheckCircle size={48} className="mx-auto text-brand-accent" />
            <h2 className="text-xl font-semibold mt-4">Shipment Claimed!</h2>
            <p className="text-sm text-foreground/70 mt-2">
              Tracking {trackingNo} has been added to your shipments.
            </p>
            {claimed && (
              <div className="mt-4 text-left bg-surface-secondary rounded-xl p-4 space-y-2">
                <p className="text-sm">
                  <span className="text-foreground/60">Status:</span> {claimed.status}
                </p>
                {claimed.carrier && (
                  <p className="text-sm">
                    <span className="text-foreground/60">Carrier:</span> {claimed.carrier}
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-3 justify-center mt-6">
              <Link
                href="/my-shipments"
                className="inline-flex items-center gap-2 rounded-full bg-brand-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-accent-hover"
              >
                <Truck size={16} /> View My Shipments
              </Link>
              <Link
                href="/claim"
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-6 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-surface"
              >
                Claim Another
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm mb-6">
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                  step === 'enter-tracking'
                    ? 'bg-brand-accent text-white'
                    : 'bg-brand-accent/10 text-brand-accent'
                }`}
              >
                {step !== 'enter-tracking' ? '✓' : '1'}
              </span>
              <span className={step === 'enter-tracking' ? 'font-medium' : 'text-foreground/60'}>
                Enter Tracking No
              </span>
              <div className="w-8 h-px bg-border" />
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                  step === 'verify-otp'
                    ? 'bg-brand-accent text-white'
                    : 'bg-surface-secondary text-foreground/50'
                }`}
              >
                2
              </span>
              <span className={step === 'verify-otp' ? 'font-medium' : 'text-foreground/60'}>
                Verify OTP
              </span>
            </div>

            <div className="rounded-2xl border border-border bg-white overflow-hidden">
              <div className="p-5 border-b border-border">
                <h1 className="text-lg font-semibold">
                  {step === 'enter-tracking' ? 'Claim a Shipment' : 'Verify your email'}
                </h1>
              </div>
              <div className="p-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {step === 'enter-tracking' && (
                    <>
                      <p className="text-sm text-foreground/70">
                        Enter your tracking number to claim this shipment. We&apos;ll send a
                        verification code to your email.
                      </p>
                      <div className="space-y-1.5">
                        <label htmlFor="claim-tracking" className="text-sm font-medium">
                          Tracking Number
                        </label>
                        <input
                          type="text"
                          id="claim-tracking"
                          placeholder="e.g. GT123456789"
                          value={trackingNo}
                          onChange={(e) => setTrackingNo(e.target.value)}
                          required
                          className="w-full px-4 py-2.5 rounded-xl border border-border text-base outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all"
                        />
                      </div>
                    </>
                  )}

                  {step === 'verify-otp' && (
                    <>
                      <p className="text-sm text-foreground/70">
                        We sent a 6-digit code to <strong>{email}</strong>
                      </p>
                      <div className="space-y-1.5">
                        <label htmlFor="claim-otp" className="text-sm font-medium">
                          OTP Code
                        </label>
                        <input
                          type="text"
                          id="claim-otp"
                          placeholder="000000"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          required
                          maxLength={6}
                          className="w-full px-4 py-2.5 rounded-xl border border-border text-base outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setStep('enter-tracking');
                            setOtp('');
                            setError('');
                          }}
                          className="min-h-11 inline-flex items-center gap-1 text-sm text-foreground/70 hover:text-foreground transition-colors"
                        >
                          <ArrowLeft size={14} /> Change tracking number
                        </button>
                        <button
                          type="button"
                          disabled={resendTimer > 0 || resendClaim.isPending}
                          onClick={() => resendClaim.mutate(trackingNo)}
                          className="min-h-11 inline-flex items-center gap-1 text-sm text-foreground/70 hover:text-foreground transition-colors disabled:opacity-50"
                        >
                          <RefreshCw size={14} className={resendClaim.isPending ? 'animate-spin' : ''} />
                          {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
                        </button>
                      </div>
                    </>
                  )}

                  {error && <p className="text-sm text-brand-accent-hover">{error}</p>}

                  <button
                    type="submit"
                    disabled={
                      initiateClaim.isPending ||
                      verifyClaim.isPending ||
                      (step === 'enter-tracking' ? !trackingNo : otp.length !== 6)
                    }
                    className="w-full rounded-full px-6 py-2.5 text-base font-medium text-white bg-brand-accent hover:bg-brand-accent-hover disabled:opacity-50 transition-colors"
                  >
                    {(initiateClaim.isPending || verifyClaim.isPending) ? 'Please wait…' : step === 'enter-tracking' ? 'Send OTP' : 'Verify & Claim'}
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
