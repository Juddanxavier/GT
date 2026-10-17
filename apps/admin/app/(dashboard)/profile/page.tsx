'use client';

import { useState, useEffect } from 'react';
import { Avatar, Button, Chip, Input, Label, Skeleton } from '@heroui/react';
import { getUser } from '@/types/auth';
import { authClient } from '@/lib/auth-client';
import { usePageTitle } from '@/lib/use-page-title';
import { Shield, Save, Lock, User, Mail, Check, X, Building2, Trash2, AlertTriangle, MapPin } from 'lucide-react';

const sections = [
  { id: 'account', label: 'Account Information', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'danger', label: 'Danger Zone', icon: Trash2 },
] as const;

export default function ProfilePage() {
  usePageTitle('Profile');
  const { data: session, isPending, refetch } = authClient.useSession();
  const user = getUser(session);

  const [originalName, setOriginalName] = useState('');
  const [name, setName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMessage, setNameMessage] = useState('');
  const [nameDirty, setNameDirty] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordDirty, setPasswordDirty] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<'idle' | 'confirm'>('idle');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (user?.name) { setName(user.name as string); setOriginalName(user.name as string); }
  }, [user?.name]);

  async function handleNameSave(e: React.FormEvent) {
    e.preventDefault();
    setNameMessage('');
    setNameSaving(true);
    try {
      const res = await authClient.updateUser({ name });
      if (res.error) { setNameMessage(res.error.message || 'Failed to update name'); return; }
      setNameMessage('Name updated');
      setNameDirty(false);
      refetch();
    } catch {
      setNameMessage('Failed to update name');
    } finally {
      setNameSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage('');
    if (newPassword !== confirmPassword) { setPasswordMessage('Passwords do not match'); return; }
    if (newPassword.length < 6) { setPasswordMessage('Password must be at least 6 characters'); return; }
    setPasswordSaving(true);
    try {
      const res = await authClient.changePassword({ newPassword, currentPassword });
      if (res.error) { setPasswordMessage(res.error.message || 'Failed to change password'); return; }
      setPasswordMessage('Password changed');
      setPasswordDirty(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordMessage('Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteError('');
    setDeleteLoading(true);
    try {
      const { error } = await authClient.deleteUser({ password: deletePassword });
      if (error) { setDeleteError(error.message || 'Failed to delete account'); setDeleteLoading(false); return; }
      window.location.href = '/login';
    } catch { setDeleteError('Connection failed. Try again.'); setDeleteLoading(false); }
  }

  if (isPending) {
    return (
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <Skeleton className="h-64 w-full rounded-sm" />
        <div className="space-y-8">
          <Skeleton className="h-40 w-full rounded-sm" />
          <Skeleton className="h-64 w-full rounded-sm" />
        </div>
      </div>
    );
  }

  const role = (user?.role as string) ?? '';
  const tenantName = (user?.tenantName as string) ?? null;
  const branchName = (user?.branchName as string) ?? null;
  const email = (user?.email as string) ?? '';
  const initials = (user?.name as string)?.charAt(0)?.toUpperCase() ?? email.charAt(0).toUpperCase() ?? '?';

  const roleColor: Record<string, 'accent' | 'success' | 'warning' | 'default'> = {
    superadmin: 'accent',
    'tenant-admin': 'success',
    staff: 'warning',
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted">Manage your account and security settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
        {/* Left profile sidebar */}
        <aside className="lg:sticky-sidebar sticky-surface content-panel overflow-hidden">
          <div className="p-6 bg-gradient-to-b from-accent-soft/60 to-transparent border-b border-border">
            <div className="flex flex-col items-center text-center">
              <Avatar size="lg" color={roleColor[role] ?? 'default'} className="text-2xl font-semibold w-16 h-16 text-base mb-3">
                <Avatar.Fallback>{initials}</Avatar.Fallback>
              </Avatar>
              <p className="text-base font-semibold text-foreground">{user?.name as string}</p>
              <Chip size="sm" variant="soft" color={roleColor[role] ?? 'default'} className="mt-1.5">{role}</Chip>
            </div>
          </div>

          <div className="p-5 space-y-4 border-b border-border">
            <div className="flex items-start gap-2.5">
              <Mail size={14} className="text-muted shrink-0 mt-0.5" />
              <span className="text-sm text-foreground break-all">{email}</span>
            </div>
            {(tenantName || branchName) && (
              <div className="flex items-start gap-2.5">
                <Building2 size={14} className="text-muted shrink-0 mt-0.5" />
                <div className="text-sm space-y-1">
                  {tenantName && <p className="text-foreground">{tenantName}</p>}
                  {branchName && (
                    <p className="text-muted flex items-center gap-1">
                      <MapPin size={12} />
                      {branchName}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <nav aria-label="Profile sections" className="p-2 space-y-0.5">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:bg-muted/40 hover:text-foreground transition-colors"
              >
                <s.icon size={15} />
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Right content */}
        <div className="space-y-6 min-w-0">
          {/* Account Information */}
          <section id="account" className="scroll-mt-6 content-panel">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-accent-soft text-accent-soft-foreground shrink-0">
                <User size={15} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-foreground tracking-tight">Account Information</h2>
                <p className="text-xs text-muted mt-0.5">Update your display name</p>
              </div>
            </div>
            <div className="p-5">
              <form onSubmit={handleNameSave} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Display Name</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        id="name"
                        variant="secondary"
                        placeholder="Your display name"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setNameDirty(true); setNameMessage(''); }}
                        fullWidth
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      isDisabled={!nameDirty}
                      onPress={() => { setName(originalName); setNameDirty(false); setNameMessage(''); }}
                      className="flex items-center gap-1.5"
                    >
                      <X size={14} />
                      Reset
                    </Button>
                    <Button type="submit" variant="secondary" isDisabled={!nameDirty} isPending={nameSaving} className="flex items-center gap-1.5">
                      {nameSaving ? null : <Save size={14} />}
                      Save
                    </Button>
                  </div>
                </div>
                {nameMessage && (
                  <div className={`flex items-center gap-1.5 text-xs ${nameMessage === 'Name updated' ? 'text-success-soft-foreground' : 'text-danger-soft-foreground'}`}>
                    {nameMessage === 'Name updated' ? <Check size={12} /> : <X size={12} />}
                    {nameMessage}
                  </div>
                )}
              </form>
            </div>
          </section>

          {/* Security */}
          <section id="security" className="scroll-mt-6 content-panel">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-accent-soft text-accent-soft-foreground shrink-0">
                <Lock size={15} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-foreground tracking-tight">Security</h2>
                <p className="text-xs text-muted mt-0.5">Update your password to keep your account secure</p>
              </div>
            </div>
            <div className="p-5">
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    variant="secondary"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => { setCurrentPassword(e.target.value); setPasswordDirty(true); setPasswordMessage(''); }}
                    required
                    fullWidth
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      variant="secondary"
                      placeholder="Min. 6 characters"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setPasswordDirty(true); setPasswordMessage(''); }}
                      required
                      fullWidth
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      variant="secondary"
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setPasswordDirty(true); setPasswordMessage(''); }}
                      required
                      fullWidth
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Button type="submit" variant="secondary" isDisabled={!passwordDirty} isPending={passwordSaving} className="flex items-center gap-1.5">
                    {passwordSaving ? null : <Shield size={14} />}
                    Change Password
                  </Button>
                  {passwordMessage && (
                    <span className={`flex items-center gap-1.5 text-xs ${passwordMessage === 'Password changed' ? 'text-success-soft-foreground' : 'text-danger-soft-foreground'}`}>
                      {passwordMessage === 'Password changed' ? <Check size={12} /> : <X size={12} />}
                      {passwordMessage}
                    </span>
                  )}
                </div>
              </form>
            </div>
          </section>

          {/* Danger Zone */}
          <section id="danger" className="scroll-mt-6 content-panel border-danger/25">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-danger/20">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-sm bg-danger/10 text-danger-soft-foreground shrink-0">
                <Trash2 size={15} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-danger-soft-foreground tracking-tight">Danger Zone</h2>
                <p className="text-xs text-muted mt-0.5">Permanently delete your account and all associated data</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {role === 'superadmin' ? (
                <div className="flex items-center gap-2 p-3 rounded-sm bg-warning/10 border border-warning/20">
                  <AlertTriangle size={16} className="text-warning-soft-foreground shrink-0" />
                  <p className="text-xs text-muted">
                    <span className="font-medium text-warning-soft-foreground">Super admin accounts cannot be deleted.</span> Contact another super admin to manage this account.
                  </p>
                </div>
              ) : deleteConfirm === 'confirm' ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 p-3 rounded-sm bg-danger/10 border border-danger/20">
                    <AlertTriangle size={16} className="text-danger-soft-foreground shrink-0 mt-0.5" />
                    <div className="text-xs text-muted">
                      <p className="font-medium text-danger-soft-foreground mb-1">This action cannot be undone.</p>
                      <p>Your account, sessions, and all associated data will be permanently deleted. You will be signed out immediately.</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="delete-password">Enter your password to confirm</Label>
                    <Input id="delete-password" type="password" variant="secondary" placeholder="Current password" value={deletePassword} onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(''); }} fullWidth />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="danger" onPress={handleDeleteAccount} isDisabled={!deletePassword} isPending={deleteLoading} className="flex items-center gap-1.5">
                      <Trash2 size={14} />Permanently delete account
                    </Button>
                    <Button variant="ghost" onPress={() => { setDeleteConfirm('idle'); setDeletePassword(''); setDeleteError(''); }}>Cancel</Button>
                  </div>
                  {deleteError && (
                    <div className="flex items-center gap-1.5 text-xs text-danger-soft-foreground">
                      <X size={12} />{deleteError}
                    </div>
                  )}
                </div>
              ) : (
                <Button variant="danger" onPress={() => setDeleteConfirm('confirm')} className="flex items-center gap-1.5">
                  <Trash2 size={14} />Delete account
                </Button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}