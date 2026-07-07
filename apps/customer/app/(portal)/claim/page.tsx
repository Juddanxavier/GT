'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Card, CardBody, CardHeader, Input, Button, Chip, Divider } from '@heroui/react';
import { Package, Mail, CheckCircle, ArrowLeft, Truck } from 'lucide-react';
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
  const [trackingNo, setTrackingNo] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [claimed, setClaimed] = useState<ShipmentData | null>(null);

  // Step 1: Initiate claim — sends OTP
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (step === 'enter-tracking') initiateClaim.mutate(trackingNo);
    if (step === 'verify-otp') verifyClaim.mutate({ tracking: trackingNo, code: otp });
  };

  if (step === 'success') {
    return (
      <Card className="max-w-lg mx-auto mt-8">
        <CardBody className="text-center py-12">
          <CheckCircle size={48} className="mx-auto text-success" />
          <h2 className="text-xl font-semibold mt-4">Shipment Claimed!</h2>
          <p className="text-sm text-muted mt-2">
            Tracking {trackingNo} has been added to your shipments.
          </p>
          {claimed && (
            <div className="mt-4 text-left bg-muted/5 rounded-lg p-4 space-y-2">
              <p className="text-sm"><span className="text-muted">Status:</span> {claimed.status}</p>
              {claimed.carrier && <p className="text-sm"><span className="text-muted">Carrier:</span> {claimed.carrier}</p>}
            </div>
          )}
          <div className="flex gap-3 justify-center mt-6">
            <Button as="a" href="/my-shipments" color="primary">
              <Truck size={16} /> View My Shipments
            </Button>
            <Button as="a" href="/claim" variant="flat">Claim Another</Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-8 space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        <Chip color={step === 'enter-tracking' ? 'primary' : 'success'} variant="flat" size="sm">1</Chip>
        <span className={step === 'enter-tracking' ? 'font-medium' : 'text-muted'}>Enter Tracking</span>
        <Divider className="w-8" />
        <Chip color={step === 'verify-otp' ? 'primary' : 'default'} variant="flat" size="sm">2</Chip>
        <span className={step === 'verify-otp' ? 'font-medium' : 'text-muted'}>Verify OTP</span>
      </div>

      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold">
            {step === 'enter-tracking' ? 'Claim a Shipment' : 'Verify your email'}
          </h1>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 'enter-tracking' && (
              <>
                <p className="text-sm text-muted">
                  Enter your tracking number to claim this shipment. We&apos;ll send a verification code to your email.
                </p>
                <Input
                  label="Tracking Number"
                  placeholder="e.g. GT123456789"
                  value={trackingNo}
                  onValueChange={setTrackingNo}
                  isRequired
                  startContent={<Package size={16} />}
                />
              </>
            )}

            {step === 'verify-otp' && (
              <>
                <p className="text-sm text-muted">
                  We sent a 6-digit code to <strong>{email}</strong>
                </p>
                <Input
                  label="OTP Code"
                  placeholder="000000"
                  value={otp}
                  onValueChange={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                  isRequired
                  maxLength={6}
                  startContent={<Mail size={16} />}
                />
                <Button
                  size="sm"
                  variant="light"
                  onPress={() => { setStep('enter-tracking'); setOtp(''); setError(''); }}
                >
                  <ArrowLeft size={14} /> Change tracking number
                </Button>
              </>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button
              color="primary"
              type="submit"
              className="w-full"
              isLoading={initiateClaim.isPending || verifyClaim.isPending}
              isDisabled={step === 'enter-tracking' ? !trackingNo : otp.length !== 6}
            >
              {step === 'enter-tracking' ? 'Send OTP' : 'Verify & Claim'}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
