'use client';

import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, Input, Button, Chip } from '@heroui/react';
import { Package, Mail, CheckCircle, ArrowLeft, Truck, RefreshCw } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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

  // Auto-advance if trackingNo pre-filled from URL
  useEffect(() => {
    if (trackingNo && step === 'enter-tracking') {
      initiateClaim.mutate(trackingNo);
    }
    // ponytail: run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  // Step 1: Initiate claim - sends OTP
  const initiateClaim = useMutation({
    mutationFn: async (tracking: string) => {
      const res = await fetch(`${API_BASE}/api/track/claim/init`, {
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

  // Step 2: Verify OTP
  const verifyClaim = useMutation({
    mutationFn: async ({ tracking, code }: { tracking: string; code: string }) => {
      const res = await fetch(`${API_BASE}/api/track/claim/verify-otp`, {
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

  // Resend OTP
  const resendClaim = useMutation({
    mutationFn: async (tracking: string) => {
      const res = await fetch(`${API_BASE}/api/track/claim/resend-otp`, {
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

  if (step === 'success') {
    return (
      <Card className="max-w-lg mx-auto mt-8 text-center py-12 px-6">
        <CheckCircle size={48} className="mx-auto text-success" />
        <h2 className="text-xl font-semibold mt-4">Shipment Claimed!</h2>
        <p className="text-sm text-foreground/70 mt-2">
          Tracking {trackingNo} has been added to your shipments.
        </p>
        {claimed && (
          <div className="mt-4 text-left bg-foreground/5 rounded-lg p-4 space-y-2">
            <p className="text-sm"><span className="text-foreground/70">Status:</span> {claimed.status}</p>
            {claimed.carrier && <p className="text-sm"><span className="text-foreground/70">Carrier:</span> {claimed.carrier}</p>}
          </div>
        )}
        <div className="flex gap-3 justify-center mt-6">
          <Link href="/my-shipments"><Button variant="primary"><Truck size={16} /> View My Shipments</Button></Link>
          <Link href="/claim"><Button variant="ghost">Claim Another</Button></Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-8 space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        <Chip color={step === 'enter-tracking' ? 'accent' : 'success'} variant="soft" size="sm">1</Chip>
        <span className={step === 'enter-tracking' ? 'font-medium' : 'text-foreground/70'}>Enter Tracking No</span>
        <div className="w-8 h-px bg-border" />
        <Chip color={step === 'verify-otp' ? 'accent' : 'default'} variant="soft" size="sm">2</Chip>
        <span className={step === 'verify-otp' ? 'font-medium' : 'text-foreground/70'}>Verify OTP</span>
      </div>

      <Card>
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
                  Enter your tracking number to claim this shipment. We&apos;ll send a verification code to your email.
                </p>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Tracking Number</label>
                  <input
                    type="text"
                    placeholder="e.g. GT123456789"
                    value={trackingNo}
                    onChange={(e) => setTrackingNo(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-foreground/10 text-base outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] transition-all"
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
                  <label className="text-sm font-medium">OTP Code</label>
                  <input
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    maxLength={6}
                    className="w-full px-4 py-2.5 rounded-xl border border-foreground/10 text-base outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] transition-all"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onPress={() => { setStep('enter-tracking'); setOtp(''); setError(''); }}
                  >
                    <ArrowLeft size={14} /> Change tracking number
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    isDisabled={resendTimer > 0 || resendClaim.isPending}
                    isPending={resendClaim.isPending}
                    onPress={() => resendClaim.mutate(trackingNo)}
                  >
                    <RefreshCw size={14} /> {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
                  </Button>
                </div>
              </>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button
              variant="primary"
              type="submit"
              className="w-full"
              isPending={initiateClaim.isPending || verifyClaim.isPending}
              isDisabled={step === 'enter-tracking' ? !trackingNo : otp.length !== 6}
            >
              {step === 'enter-tracking' ? 'Send OTP' : 'Verify & Claim'}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
