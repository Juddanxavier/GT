'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { User, Eye, EyeOff, Calendar, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { Button, Input, InputGroup, TextField, Label } from '@heroui/react';
import { ErrorBoundary } from '@/components/error-boundary';
import { authClient } from '@/lib/auth-client';
import { useTenantConfig } from '@/lib/use-tenant-config';
import { useUpdateProfile } from '@/lib/queries';

function ProfilePageContent(): ReactNode {
  const config = useTenantConfig();
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const isEmerald = config.theme === 'emerald';

  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const updateProfile = useUpdateProfile();

  // Sync form fields from session once loaded (useEffect avoids render-time side effect)
  useEffect(() => {
    if (session) {
      setName(session.user?.name ?? '');
    }
  }, [session]);

  if (sessionLoading) {
    return (
      <div className="max-w-lg mx-auto space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-surface border border-border animate-pulse mb-4" />
          <div className="h-7 w-24 bg-surface rounded-lg animate-pulse mx-auto mb-2" />
          <div className="h-4 w-48 bg-surface rounded-lg animate-pulse mx-auto" />
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 space-y-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!session) {
    return <p className="text-center text-muted py-20">Sign in to view your profile.</p>;
  }

  const userInfo = session.user;
  const createdAt = userInfo?.createdAt
    ? new Date(userInfo.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const data: { name?: string; currentPassword?: string; newPassword?: string } = {};
    if (name !== userInfo?.name) data.name = name;
    if (currentPassword && newPassword) {
      data.currentPassword = currentPassword;
      data.newPassword = newPassword;
    }
    if (Object.keys(data).length === 0) return;
    updateProfile.mutate(data, {
      onSuccess: () => {
        setCurrentPassword('');
        setNewPassword('');
      },
    });
  }

  const hasChanges =
    name !== userInfo?.name ||
    (currentPassword.length > 0 && newPassword.length > 0);

  return (
    <div className="max-w-lg mx-auto space-y-8">
      {/* Avatar & Info Header */}
      <div className="text-center">
        <div
          className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${
            isEmerald ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'
          } mb-4 ring-4 ring-white/50 shadow-sm`}
        >
          <User size={30} />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{userInfo?.name}</h1>
        <p className="text-sm text-muted mt-1">{userInfo?.email}</p>
        {createdAt && (
          <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-muted">
            <Calendar size={12} />
            <span>Member since {createdAt}</span>
          </div>
        )}
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        {/* Name Section */}
        <div className="p-6 pb-4 space-y-4">
          <div>
            <TextField
              fullWidth
              name="name"
              type="text"
              value={name}
              onChange={(v) => setName(v)}
            >
              <Label>Full Name</Label>
              <Input placeholder="Your name" />
            </TextField>
          </div>

          {/* Email (read-only) */}
          <div>
            <TextField fullWidth name="email" type="email" value={userInfo?.email ?? ''} isReadOnly>
              <Label>Email</Label>
              <Input placeholder="Email address" />
            </TextField>
            <p className="text-xs text-muted mt-1.5 ml-1">
              Email cannot be changed. Contact support for email updates.
            </p>
          </div>
        </div>

        {/* Password Section */}
        <div className="border-t border-separator px-6 py-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">Change Password</h2>
          <div className="space-y-3">
            <TextField
              fullWidth
              name="cpw"
              type="password"
              value={currentPassword}
              onChange={(v) => setCurrentPassword(v)}
            >
              <Label>Current Password</Label>
              <Input placeholder="Leave blank to keep same" autoComplete="current-password" />
            </TextField>
            <TextField
              fullWidth
              name="npw"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(v) => setNewPassword(v)}
            >
              <Label>New Password</Label>
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
          </div>
        </div>

        {/* Status Messages */}
        <div className="px-6 pb-4">
          {updateProfile.isError && (
            <div className="flex items-center gap-2 text-xs text-danger bg-danger-50 dark:bg-danger-950/20 rounded-lg px-3 py-2">
              <AlertCircle size={14} />
              <span>{updateProfile.error?.message || 'Update failed. Please try again.'}</span>
            </div>
          )}
          {updateProfile.isSuccess && (
            <div className="flex items-center gap-2 text-xs text-success bg-success-50 dark:bg-success-950/20 rounded-lg px-3 py-2">
              <CheckCircle size={14} />
              <span>Profile updated successfully.</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-separator px-6 py-4 flex gap-3 justify-end">
          {hasChanges && (
            <Button
              type="button"
              variant="ghost"
              onPress={() => {
                setName(userInfo?.name ?? '');
                setCurrentPassword('');
                setNewPassword('');
                updateProfile.reset();
              }}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            isDisabled={updateProfile.isPending || !hasChanges}
            isPending={updateProfile.isPending}
            className={`text-white px-6 ${isEmerald ? 'bg-emerald-600' : 'bg-violet-600'}`}
          >
            {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function ProfilePage(): ReactNode {
  return <ErrorBoundary><ProfilePageContent /></ErrorBoundary>;
}
