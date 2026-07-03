'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, InputGroup, TextField, Label, FieldError } from '@heroui/react';
import { Mail, Lock, User, Eye, EyeOff, LoaderCircle, CheckCircle2, XCircle } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { usePageTitle } from '@/lib/use-page-title';

function OnboardForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validated, setValidated] = useState(false);
  const [currentToken, setCurrentToken] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Missing activation token. Please use the link from your email.');
      setLoading(false);
      return;
    }

    setCurrentToken(token);

    async function validateToken() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/onboard/validate?token=${encodeURIComponent(token!)}`,
          { credentials: 'include' },
        );
        const body = await res.json();
        if (!res.ok) {
          setError(body.error || 'Invalid or expired activation link.');
        } else {
          setEmail(body.data.email ?? '');
          setName(body.data.name ?? '');
          setValidated(true);
        }
      } catch {
        setError('Connection failed. Please try again.');
      }
      setLoading(false);
    }

    validateToken();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (honeypot) return;

    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Name is required';
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Must be at least 8 characters';
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'Must include an uppercase letter';
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Must include a number';
    } else if (!/[!@#$%^&*(),.?"':{}|<>]/.test(password)) {
      errors.password = 'Must include a special character';
    }
    if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/onboard/complete`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: currentToken, name: name.trim(), password }),
        },
      );
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || 'Failed to set up your account.');
      } else {
        setSuccess(true);
        setTimeout(() => router.push('/login'), 3000);
      }
    } catch {
      setError('Connection failed. Please try again.');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0c12]">
        <LoaderCircle size={24} className="animate-spin text-emerald-400" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0c12] px-6">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">All set!</h1>
          <p className="text-sm text-zinc-400 mb-4">Your account has been configured. Redirecting to login...</p>
          <Button onPress={() => router.push('/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  if (error && !validated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0c12] px-6">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 mb-6">
            <XCircle size={32} className="text-red-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">Invalid Link</h1>
          <p className="text-sm text-zinc-400 mb-4">{error}</p>
          <Button onPress={() => router.push('/login')}>Back to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0c0c12]">
      {/* ── Left Brand Panel ── */}
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
          <div className="my-8 mx-auto w-12 h-px bg-emerald-500/30" />
          <p className="text-sm text-zinc-400 leading-relaxed">
            One last step — set up your password and you&apos;ll be ready to start tracking shipments.
          </p>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <span className="text-emerald-400 text-xl font-bold tracking-tight">GT</span>
            </div>
            <h1 className="text-xl font-semibold text-white tracking-tight">Gajan Traders</h1>
            <p className="text-sm text-zinc-500 mt-1">Set up your password</p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-semibold text-white tracking-tight">Activate your account</h2>
            <p className="text-sm text-zinc-500 mt-1">Choose a password to get started</p>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Honeypot — invisible to users, traps bots */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="hp-onboard">Leave empty</label>
              <input
                id="hp-onboard"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            {/* Email (read-only) */}
            <TextField fullWidth name="email" type="email" value={email} isReadOnly>
              <Label>Email</Label>
              <InputGroup fullWidth>
                <InputGroup.Prefix>
                  <Mail size={16} className="text-muted" />
                </InputGroup.Prefix>
                <InputGroup.Input placeholder="email@example.com" />
              </InputGroup>
            </TextField>

            {/* Name */}
            <TextField
              fullWidth
              isInvalid={!!fieldErrors.name}
              name="name"
              type="text"
              value={name}
              onChange={(v) => setName(v)}
            >
              <Label>Name</Label>
              <InputGroup fullWidth>
                <InputGroup.Prefix>
                  <User size={16} className="text-muted" />
                </InputGroup.Prefix>
                <InputGroup.Input placeholder="Your full name" />
              </InputGroup>
              {fieldErrors.name && <FieldError>{fieldErrors.name}</FieldError>}
            </TextField>

            {/* Password */}
            <TextField
              fullWidth
              isInvalid={!!fieldErrors.password}
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(v) => setPassword(v)}
            >
              <Label>Password</Label>
              <InputGroup fullWidth>
                <InputGroup.Input
                  placeholder="Create a password"
                  autoComplete="new-password"
                />
                <InputGroup.Suffix className="pr-0">
                  <Button
                    isIconOnly
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    size="sm"
                    variant="ghost"
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </InputGroup.Suffix>
              </InputGroup>
              {fieldErrors.password && <FieldError>{fieldErrors.password}</FieldError>}
            </TextField>

            {/* Confirm Password */}
            <TextField
              fullWidth
              isInvalid={!!fieldErrors.confirmPassword}
              name="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(v) => setConfirmPassword(v)}
            >
              <Label>Confirm Password</Label>
              <InputGroup fullWidth>
                <InputGroup.Input
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                />
                <InputGroup.Suffix className="pr-0">
                  <Button
                    isIconOnly
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    size="sm"
                    variant="ghost"
                    onPress={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </InputGroup.Suffix>
              </InputGroup>
              {fieldErrors.confirmPassword && <FieldError>{fieldErrors.confirmPassword}</FieldError>}
            </TextField>

            <Button type="submit" fullWidth isDisabled={saving}>
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <LoaderCircle size={16} className="animate-spin" />
                  Setting up...
                </span>
              ) : (
                'Set Password'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function OnboardPage() {
  usePageTitle('Set Up Account');
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#0c0c12]">
            <LoaderCircle size={24} className="animate-spin text-emerald-400" />
          </div>
        }
      >
        <OnboardForm />
      </Suspense>
    </ErrorBoundary>
  );
}
