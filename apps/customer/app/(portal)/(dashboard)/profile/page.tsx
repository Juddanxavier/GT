'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { User, Eye, EyeOff, Calendar, CheckCircle, AlertCircle, Mail, Phone, MapPin, Building2, Trash2 } from 'lucide-react';
import { Button, Input, InputGroup, TextField, Label } from '@heroui/react';
import { ErrorBoundary } from '@/components/error-boundary';
import { authClient } from '@/lib/auth-client';
import { useUpdateProfile, useDeleteAccount } from '@/lib/queries';

interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
}

function ProfilePageContent(): ReactNode {
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const [branches, setBranches] = useState<Branch[]>([]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [branchId, setBranchId] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { mutate: saveProfile, isPending: savePending, isError: saveError, isSuccess: saveSuccess, error: saveErrorData, reset: saveReset } = useUpdateProfile();
  const deleteAccount = useDeleteAccount();

  useEffect(() => {
    fetch('/api/branches/public')
      .then((r) => r.json())
      .then((d) => setBranches(Array.isArray(d.data) ? d.data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    const u = session.user as Record<string, unknown>;
    setName((u.name as string) ?? '');
    setPhone((u.phone as string) ?? '');
    setBranchId((u.branchId as string) ?? '');
    const addr = u.address as Record<string, string> | undefined;
    setStreet(addr?.street ?? '');
    setCity(addr?.city ?? '');
    setState(addr?.state ?? '');
    setPincode(addr?.pincode ?? '');
  }, [session]);

  if (sessionLoading) {
    return (
      <div className="max-w-lg mx-auto space-y-8 animate-pulse">
        <div className="text-center"><div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-foreground/5 mb-4" /><div className="h-7 w-24 bg-foreground/5 rounded-lg mx-auto mb-2" /><div className="h-4 w-48 bg-foreground/5 rounded-lg mx-auto" /></div>
        {[1, 2, 3].map((i) => (<div key={i} className="rounded-2xl bg-foreground/[0.02] p-6 space-y-4"><div className="h-10 bg-foreground/5 rounded-xl" /></div>))}
      </div>
    );
  }

  if (!session) return null;

  const userInfo = session.user;
  const createdAt = userInfo?.createdAt
    ? new Date(userInfo.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const hasProfileChanges = name !== (userInfo as Record<string, unknown>).name ||
    phone !== ((userInfo as Record<string, unknown>).phone as string ?? '') ||
    branchId !== ((userInfo as Record<string, unknown>).branchId as string ?? '') ||
    street !== ((userInfo as Record<string, unknown>).address as Record<string, string> | undefined)?.street ||
    city !== ((userInfo as Record<string, unknown>).address as Record<string, string> | undefined)?.city ||
    state !== ((userInfo as Record<string, unknown>).address as Record<string, string> | undefined)?.state ||
    pincode !== ((userInfo as Record<string, unknown>).address as Record<string, string> | undefined)?.pincode;

  const hasPasswordChanges = currentPassword.length > 0 && newPassword.length > 0;
  const hasChanges = hasProfileChanges || hasPasswordChanges;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const data: Record<string, unknown> = {};
    if (name !== (userInfo as Record<string, unknown>).name) data.name = name;
    if (phone !== ((userInfo as Record<string, unknown>).phone as string ?? '')) data.phone = phone;
    if (branchId !== ((userInfo as Record<string, unknown>).branchId as string ?? '')) data.branchId = branchId;
    if (hasProfileChanges) data.address = { street, city, state, pincode };
    if (currentPassword && newPassword) {
      data.currentPassword = currentPassword;
      data.newPassword = newPassword;
    }
    if (Object.keys(data).length === 0) return;
    saveProfile(data as Parameters<ReturnType<typeof useUpdateProfile>['mutate']>[0], {
      onSuccess: () => {
        setCurrentPassword('');
        setNewPassword('');
      },
    });
  }

  function handleCancel() {
    const u = userInfo as Record<string, unknown>;
    setName((u.name as string) ?? '');
    setPhone((u.phone as string) ?? '');
    setBranchId((u.branchId as string) ?? '');
    const addr = u.address as Record<string, string> | undefined;
    setStreet(addr?.street ?? '');
    setCity(addr?.city ?? '');
    setState(addr?.state ?? '');
    setPincode(addr?.pincode ?? '');
    setCurrentPassword('');
    setNewPassword('');
    saveReset();
  }

  async function handleDelete() {
    deleteAccount.mutate(undefined, {
      onSuccess: () => {
        window.location.href = '/';
      },
    });
  }

  const canSave = !!(hasProfileChanges || hasPasswordChanges);

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#F94735]/10 text-[#F94735] flex items-center justify-center">
          <User size={24} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Profile</h1>
          <p className="text-foreground/50 mt-0.5">Manage your account details.</p>
        </div>
      </div>

      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F94735]/10 text-[#F94735] mb-4 shadow-sm">
          <User size={30} />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{userInfo?.name}</h1>
        <div className="flex items-center justify-center gap-1.5 mt-2 text-foreground/50">
          <Mail size={14} />
          <span>{userInfo?.email}</span>
        </div>
        {createdAt && (
          <div className="flex items-center justify-center gap-1.5 mt-1.5 text-xs text-foreground/40">
            <Calendar size={12} />
            <span>Member since {createdAt}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="rounded-2xl bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="p-6 pb-4 space-y-4">
          <TextField fullWidth name="name" type="text" value={name} onChange={(v) => setName(v)}>
            <Label>Full Name</Label>
            <Input placeholder="Your name" />
          </TextField>

          <TextField fullWidth name="phone" type="tel" value={phone} onChange={(v) => setPhone(v)}>
            <Label>Phone</Label>
            <Input placeholder="+91 9876543210" />
          </TextField>

          <TextField fullWidth name="email" type="email" value={userInfo?.email ?? ''} isReadOnly>
            <Label>Email</Label>
            <Input placeholder="Email address" />
          </TextField>
          <p className="text-xs text-foreground/40 -mt-2 ml-1">Email cannot be changed. Contact support for email updates.</p>
        </div>

        <div className="border-t border-foreground/5 px-6 py-4 space-y-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Building2 size={14} className="text-[#F94735]" />
            <span className="font-semibold text-foreground">Branch &amp; Address</span>
          </div>

          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-[#F94735]/50 border border-foreground/10 bg-white text-sm">
            <option value="">Select your nearest branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <div className="grid grid-cols-1 gap-3">
            <input type="text" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Street / Area" className="w-full px-4 py-2.5 rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-[#F94735]/50 border border-foreground/10 bg-white text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="w-full px-4 py-2.5 rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-[#F94735]/50 border border-foreground/10 bg-white text-sm" />
              <input type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className="w-full px-4 py-2.5 rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-[#F94735]/50 border border-foreground/10 bg-white text-sm" />
            </div>
            <input type="text" value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="PIN Code" className="w-full px-4 py-2.5 rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-[#F94735]/50 border border-foreground/10 bg-white text-sm" />
          </div>
        </div>

        <div className="border-t border-foreground/5 px-6 py-4">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">Change Password</h2>
          <div className="space-y-3">
            <TextField fullWidth name="cpw" type="password" value={currentPassword} onChange={(v) => setCurrentPassword(v)}>
              <Label>Current Password</Label>
              <Input placeholder="Leave blank to keep same" autoComplete="current-password" />
            </TextField>
            <TextField fullWidth name="npw" type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(v) => setNewPassword(v)}>
              <Label>New Password</Label>
              <InputGroup fullWidth>
                <InputGroup.Input placeholder="Min. 8 characters" autoComplete="new-password" />
                <InputGroup.Suffix className="pr-0">
                  <Button isIconOnly aria-label="Toggle password visibility" size="sm" variant="ghost" onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </InputGroup.Suffix>
              </InputGroup>
            </TextField>
          </div>
        </div>

        <div className="px-6 pb-4">
          {saveError && (
            <div className="flex items-center gap-2 text-xs text-danger bg-red-50 rounded-lg px-3 py-2">
              <AlertCircle size={14} />
              <span>{saveErrorData?.message || 'Update failed. Please try again.'}</span>
            </div>
          )}
          {saveSuccess && (
            <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
              <CheckCircle size={14} />
              <span>Profile updated successfully.</span>
            </div>
          )}
        </div>

        <div className="border-t border-foreground/5 px-6 py-4 flex gap-3 justify-end">
          {hasChanges && (
            <Button type="button" variant="ghost" onPress={handleCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" isDisabled={savePending || !hasChanges} isPending={savePending} className="bg-[#F94735] text-white px-6">
            Save Changes
          </Button>
        </div>
      </form>

      <div className="rounded-2xl bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Trash2 size={16} className="text-red-500" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Delete Account</h2>
          </div>
          <p className="text-xs text-foreground/50">Permanently delete your account and all associated data. This action cannot be undone.</p>
        </div>
        <div className="border-t border-foreground/5 px-6 py-4">
          {!confirmDelete ? (
            <Button type="button" variant="ghost" className="text-red-600 border-red-200" onPress={() => setConfirmDelete(true)}>
              Delete Account
            </Button>
          ) : (
            <div className="space-y-3">
              {deleteAccount.isError && (
                <div className="flex items-center gap-2 text-xs text-danger bg-red-50 rounded-lg px-3 py-2">
                  <AlertCircle size={14} />
                  <span>{deleteAccount.error?.message || 'Delete failed. Please try again.'}</span>
                </div>
              )}
              <p className="text-xs text-foreground/60">Are you sure? This will permanently delete your account.</p>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onPress={() => { setConfirmDelete(false); deleteAccount.reset(); }}>
                  Cancel
                </Button>
                <Button type="button" isPending={deleteAccount.isPending} className="bg-red-600 text-white" onPress={handleDelete}>
                  {deleteAccount.isPending ? 'Deleting...' : 'Confirm Delete'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage(): ReactNode {
  return <ErrorBoundary><ProfilePageContent /></ErrorBoundary>;
}