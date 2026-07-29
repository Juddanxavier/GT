'use client';

import type { ReactNode, JSX } from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Phone, MapPin, CheckCircle } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { authClient } from '@/lib/auth-client';

interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
}

function OnboardingPageContent(): ReactNode {
  const router = useRouter();
  const { data: session, isPending: sessionLoading, error: sessionError } = authClient.useSession();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [branchId, setBranchId] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  useEffect(() => {
    if (sessionLoading) return;
    if (!session) return;
    if (sessionError) { setError('Your session could not be verified — redirecting to login'); }
    const u = session.user;
    if (!u) return;
    if ((u as Record<string, unknown>).phone && (u as Record<string, unknown>).branchId) {
      router.push('/dashboard');
      return;
    }
    const existingPhone = (u as Record<string, unknown>).phone;
    setPhone(typeof existingPhone === 'string' && existingPhone ? existingPhone as string : '+91 ');
    fetch('/api/branches/public')
      .then((r) => r.json())
      .then((d) => { setBranches(Array.isArray(d.data) ? d.data : []); setLoading(false); })
      .catch(() => { setError('Could not load branch list — please refresh the page to try again'); setLoading(false); });
  }, [session, sessionLoading, router, sessionError]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const errors: string[] = [];
    if (!branchId) errors.push('Please select your nearest branch');
    const cleaned = phone.replace(/\s+/g, '');
    if (cleaned === '+91') errors.push('Please enter your phone number');
    else if (!cleaned.startsWith('+91')) errors.push('Phone must start with +91 (India country code)');
    else if (cleaned.length < 12) errors.push('Phone number too short — enter 10 digits after +91');
    if (!street.trim()) errors.push('Street / Area is required');
    if (!city.trim()) errors.push('City is required');
    if (!state.trim()) errors.push('State is required');
    if (!pincode.trim()) errors.push('PIN code is required');
    else if (!/^\d{6}$/.test(pincode.trim())) errors.push('PIN code must be 6 digits');
    if (errors.length) { setError(errors.join('. ')); return; }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        branchId,
        phone: cleaned,
        address: { street, city, state, pincode },
      };
      const res = await fetch('/api/customers/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        const err = data.error;
        const msg = typeof err === 'string' ? err : typeof err === 'object' && err && 'message' in err ? (err as { message: string }).message : 'Failed to save your profile';
        setError(msg + '. Please try again or contact support.');
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch {
      setError('Unable to connect to the server. Check your internet and try again.');
    } finally { setSaving(false); }
  }

  if (loading || sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-2 border-[#F94735] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle size={32} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">All set!</h2>
        <p className="text-foreground/70">Redirecting to your dashboard...</p>
      </div>
    );
  }

  const errorMsg = typeof error === 'string' ? error : '';
  const validBranches = Array.isArray(branches) ? branches : [];

  return (
    <div className="max-w-lg mx-auto py-8 px-0 animate-[fade-up_0.4s_ease-out] space-y-8">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Complete your profile</h1>
        <p className="text-foreground/50 mt-1">Tell us a bit about yourself to get started</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-[0_1px_3px_0_rgba(0,0,0,0.06)] p-8 space-y-6">
        {errorMsg && (
          <div className="px-4 py-3 rounded-xl bg-red-50 text-red-600">{errorMsg}</div>
        )}

        <div className="space-y-2">
          <label className="font-medium text-foreground/80 flex items-center gap-1.5">
            <Building2 size={14} className="text-[#F94735]" /> Nearest Branch
          </label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full px-4 py-2.5 bg-white shadow-[inset_0_1px_2px_0_rgba(0,0,0,0.04)] rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-[#F94735]/50 border border-foreground/10"
          >
            <option value="">Select your nearest branch</option>
            {validBranches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="font-medium text-foreground/80 flex items-center gap-1.5">
            <Phone size={14} className="text-[#F94735]" /> Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 9876543210"
            className="w-full px-4 py-2.5 bg-white shadow-[inset_0_1px_2px_0_rgba(0,0,0,0.04)] rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-[#F94735]/50 border border-foreground/10"
          />
          <p className="text-xs text-foreground/40">Enter your 10-digit number — +91 is already added for India</p>
        </div>

        <div className="border-t border-foreground/5 pt-6">
          <div className="flex items-center gap-1.5 mb-4">
            <MapPin size={14} className="text-[#F94735]" />
            <span className="font-semibold text-foreground/80">Address</span>
          </div>
          <div className="space-y-3">
            <input type="text" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Street / Area" className="w-full px-4 py-2.5 bg-white shadow-[inset_0_1px_2px_0_rgba(0,0,0,0.04)] rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-[#F94735]/50 border border-foreground/10" />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="w-full px-4 py-2.5 bg-white shadow-[inset_0_1px_2px_0_rgba(0,0,0,0.04)] rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-[#F94735]/50 border border-foreground/10" />
              <input type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className="w-full px-4 py-2.5 bg-white shadow-[inset_0_1px_2px_0_rgba(0,0,0,0.04)] rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-[#F94735]/50 border border-foreground/10" />
            </div>
            <input type="text" value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="PIN Code" className="w-full px-4 py-2.5 bg-white shadow-[inset_0_1px_2px_0_rgba(0,0,0,0.04)] rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-[#F94735]/50 border border-foreground/10" />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || !branchId}
          className="w-full bg-[#F94735] hover:bg-[#e03e2d] disabled:opacity-50 text-white font-semibold rounded-xl h-11 transition-all cursor-pointer"
        >
          {saving ? 'Saving...' : 'Complete setup'}
        </button>
      </form>
    </div>
  );
}

export default function OnboardingPage(): ReactNode {
  return <ErrorBoundary><OnboardingPageContent /></ErrorBoundary>;
}
