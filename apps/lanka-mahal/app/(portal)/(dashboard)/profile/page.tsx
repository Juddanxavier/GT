'use client';

import { Button, Input, InputGroup, Label, TextField } from '@heroui/react';
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPin,
  Phone,
  Trash2,
  User,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { BranchSelect } from '@/components/profile/branch-select';
import { authClient } from '@/lib/auth-client';
import { fetchPublicBranches } from '@/lib/fetch-public-branches';
import { useDeleteAccount, useUpdateProfile } from '@/lib/queries';
import type { Branch } from '@/lib/types';
import { useCustomerSession } from '@/lib/use-customer-session';
import { useTenantConfig } from '@/lib/use-tenant-config';

function ProfileSkeleton(): ReactNode {
  return (
    <div className="max-w-2xl space-y-6 animate-pulse">
      <div className="premium-card h-28" />
      <div className="premium-card h-64" />
      <div className="premium-card h-80" />
      <div className="premium-card h-48" />
    </div>
  );
}

function ProfilePageContent(): ReactNode {
  const { user, isPending: sessionLoading } = useCustomerSession();
  const { refetch: refetchSession } = authClient.useSession();
  const config = useTenantConfig();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [branchesError, setBranchesError] = useState('');

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

  const {
    mutate: saveProfile,
    isPending: savePending,
    isError: saveError,
    isSuccess: saveSuccess,
    error: saveErrorData,
    reset: saveReset,
  } = useUpdateProfile();
  const deleteAccount = useDeleteAccount();

  useEffect(() => {
    setBranchesLoading(true);
    setBranchesError('');
    fetchPublicBranches(config.slug)
      .then((data) => {
        setBranches(data);
        setBranchesLoading(false);
      })
      .catch(() => {
        setBranchesError('Could not load branches. Please refresh and try again.');
        setBranchesLoading(false);
      });
  }, [config.slug]);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setPhone(user.phone ?? '');
    setBranchId(user.branchId ?? '');
    const addr = user.address;
    setStreet(addr?.street ?? '');
    setCity(addr?.city ?? '');
    setState(addr?.state ?? '');
    setPincode(addr?.pincode ?? '');
  }, [user?.id, user?.name, user?.phone, user?.branchId, user?.address]);

  const initials = useMemo(() => {
    const parts = (user?.name ?? '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }, [user?.name]);

  if (sessionLoading) return <ProfileSkeleton />;
  if (!user) return null;

  const createdAt = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const hasProfileChanges =
    name !== (user.name ?? '') ||
    phone !== (user.phone ?? '') ||
    branchId !== (user.branchId ?? '') ||
    street !== (user.address?.street ?? '') ||
    city !== (user.address?.city ?? '') ||
    state !== (user.address?.state ?? '') ||
    pincode !== (user.address?.pincode ?? '');

  const hasPasswordChanges = currentPassword.length > 0 && newPassword.length > 0;
  const hasChanges = hasProfileChanges || hasPasswordChanges;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const data: Record<string, unknown> = {};
    if (name !== user.name) data.name = name;
    if (phone !== (user.phone ?? '')) data.phone = phone;
    if (branchId !== (user.branchId ?? '')) data.branchId = branchId;
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
        void refetchSession();
      },
    });
  }

  function handleCancel() {
    if (!user) return;
    setName(user.name ?? '');
    setPhone(user.phone ?? '');
    setBranchId(user.branchId ?? '');
    setStreet(user.address?.street ?? '');
    setCity(user.address?.city ?? '');
    setState(user.address?.state ?? '');
    setPincode(user.address?.pincode ?? '');
    setCurrentPassword('');
    setNewPassword('');
    saveReset();
  }

  function handleDelete() {
    deleteAccount.mutate(undefined, {
      onSuccess: () => {
        window.location.href = '/';
      },
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-accent/10 text-brand-accent">
          <User size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Profile</h1>
          <p className="mt-0.5 text-foreground/50">Manage your account and delivery details.</p>
        </div>
      </div>

      <div className="premium-card flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-accent text-xl font-bold text-white shadow-[0_8px_24px_-8px_rgba(245,158,11,0.45)]">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold text-foreground">{user.name}</h2>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-foreground/55">
            <Mail size={14} className="shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>
          {createdAt && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-foreground/40">
              <Calendar size={12} />
              <span>Member since {createdAt}</span>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <section className="premium-card space-y-5 p-6">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Personal information
            </h2>
            <p className="mt-1 text-xs text-foreground/45">Your contact details for shipments and alerts.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="profile-name" className="text-sm font-medium text-foreground/80">
                Full name
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="premium-input"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="profile-phone" className="flex items-center gap-1.5 text-sm font-medium text-foreground/80">
                <Phone size={14} className="text-brand-accent" />
                Phone
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={config.phone.placeholder}
                className="premium-input"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="profile-email" className="flex items-center gap-1.5 text-sm font-medium text-foreground/80">
                <Mail size={14} className="text-brand-accent" />
                Email
              </label>
              <input
                id="profile-email"
                type="email"
                value={user.email ?? ''}
                readOnly
                className="premium-input cursor-not-allowed bg-foreground/[0.03] text-foreground/60"
              />
            </div>
          </div>
          <p className="text-xs text-foreground/40">
            Email cannot be changed online. Contact support if you need to update it.
          </p>
        </section>

        <section className="premium-card space-y-5 p-6">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-foreground">
              <Building2 size={14} className="text-brand-accent" />
              Nearest branch
            </h2>
            <p className="mt-1 text-xs text-foreground/45">
              Pick the office you usually visit for drop-offs and pickups.
            </p>
          </div>

          <BranchSelect
            branches={branches}
            value={branchId}
            onChange={setBranchId}
            loading={branchesLoading}
            error={branchesError}
          />

          <div className="border-t border-foreground/5 pt-5">
            <h3 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-foreground/80">
              <MapPin size={14} className="text-brand-accent" />
              Your address
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Street / Area"
                className="premium-input"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="premium-input"
                />
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  className="premium-input"
                />
              </div>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder={config.postalCode.label}
                className="premium-input"
              />
            </div>
          </div>
        </section>

        <section className="premium-card space-y-4 p-6">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-foreground">
              <Lock size={14} className="text-brand-accent" />
              Security
            </h2>
            <p className="mt-1 text-xs text-foreground/45">Leave blank to keep your current password.</p>
          </div>

          <TextField
            fullWidth
            name="current-password"
            type="password"
            value={currentPassword}
            onChange={(v) => setCurrentPassword(v)}
          >
            <Label>Current password</Label>
            <Input placeholder="Enter current password" autoComplete="current-password" />
          </TextField>

          <TextField
            fullWidth
            name="new-password"
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(v) => setNewPassword(v)}
          >
            <Label>New password</Label>
            <InputGroup fullWidth>
              <InputGroup.Input placeholder="Min. 8 characters" autoComplete="new-password" />
              <InputGroup.Suffix className="pr-0">
                <Button
                  isIconOnly
                  aria-label="Toggle password visibility"
                  size="sm"
                  variant="ghost"
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </InputGroup.Suffix>
            </InputGroup>
          </TextField>
        </section>

        {(saveError || saveSuccess || hasChanges) && (
          <div className="premium-card space-y-4 p-6">
            {saveError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle size={16} />
                <span>{saveErrorData?.message || 'Update failed. Please try again.'}</span>
              </div>
            )}
            {saveSuccess && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle size={16} />
                <span>Profile updated successfully.</span>
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-3">
              {hasChanges && (
                <button type="button" onClick={handleCancel} className="premium-btn-ghost">
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={savePending || !hasChanges}
                className="premium-btn min-w-[140px] disabled:opacity-50"
              >
                {savePending ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </form>

      <section className="premium-card overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-2">
            <Trash2 size={16} className="text-red-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Delete account
            </h2>
          </div>
          <p className="mt-2 text-xs text-foreground/50">
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
        </div>
        <div className="border-t border-foreground/5 px-6 py-4">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="premium-btn-ghost border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50"
            >
              Delete account
            </button>
          ) : (
            <div className="space-y-3">
              {deleteAccount.isError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle size={16} />
                  <span>{deleteAccount.error?.message || 'Delete failed. Please try again.'}</span>
                </div>
              )}
              <p className="text-sm text-foreground/60">
                Are you sure? This will permanently delete your account.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDelete(false);
                    deleteAccount.reset();
                  }}
                  className="premium-btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteAccount.isPending}
                  onClick={handleDelete}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-red-600 px-6 text-sm font-medium text-white disabled:opacity-60"
                >
                  {deleteAccount.isPending ? 'Deleting...' : 'Confirm delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function ProfilePage(): ReactNode {
  return (
    <ErrorBoundary>
      <ProfilePageContent />
    </ErrorBoundary>
  );
}
