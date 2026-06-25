'use client';

import { useState, useEffect } from 'react';
import { Avatar, Button, Card, Chip, Input, Label, Skeleton } from '@heroui/react';
import { authClient } from '@/lib/auth-client';
import { usePageTitle } from '@/lib/use-page-title';
import { Shield, Save, Lock, User, Mail, Check, X, Building2 } from 'lucide-react';

export default function ProfilePage() {
  usePageTitle('Profile');
  const { data: session, isPending, refetch } = authClient.useSession();
  const user = session?.user as Record<string, unknown> | undefined;

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

  if (isPending) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-7 w-24 rounded" />
        <Card>
          <Card.Content className="flex items-center gap-5 p-6">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-40 rounded" />
              <Skeleton className="h-4 w-56 rounded" />
            </div>
          </Card.Content>
        </Card>
        <Card><Card.Content className="space-y-4 p-6"><Skeleton className="h-4 w-full rounded" /><Skeleton className="h-10 w-full rounded" /><Skeleton className="h-9 w-24 rounded" /></Card.Content></Card>
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Profile</h1>
        <p className="text-sm text-muted mt-0.5">Manage your account and security settings</p>
      </div>

      {/* Profile summary */}
      <Card className="border-t-2 border-t-accent">
        <Card.Content className="flex items-center gap-5 p-6">
          <Avatar size="lg" color={roleColor[role] ?? 'default'} className="text-2xl font-semibold shrink-0">
            <Avatar.Fallback>{initials}</Avatar.Fallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-base font-medium">{user?.name as string}</span>
              <Chip size="sm" variant="soft" color={roleColor[role] ?? 'default'}>{role}</Chip>
            </div>
            <p className="text-sm text-muted mt-0.5 flex items-center gap-1.5">
              <Mail size={13} className="shrink-0" />
              {email}
            </p>
            {(tenantName || branchName) && (
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted">
                {tenantName && (
                  <span className="flex items-center gap-1">
                    <Building2 size={12} />
                    {tenantName}
                  </span>
                )}
                {branchName && (
                  <>
                    <span className="text-muted/40">/</span>
                    <span className="flex items-center gap-1">
                      <Building2 size={12} />
                      {branchName}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* Display name */}
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center gap-2 text-sm font-semibold">
            <User size={15} />
            Account Information
          </Card.Title>
        </Card.Header>
        <Card.Content>
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
              <div className={`flex items-center gap-1.5 text-xs ${nameMessage === 'Name updated' ? 'text-success' : 'text-danger'}`}>
                {nameMessage === 'Name updated' ? <Check size={12} /> : <X size={12} />}
                {nameMessage}
              </div>
            )}
          </form>
        </Card.Content>
      </Card>

      {/* Change password */}
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center gap-2 text-sm font-semibold">
            <Lock size={15} />
            Security
          </Card.Title>
          <Card.Description className="text-xs text-muted">
            Update your password to keep your account secure
          </Card.Description>
        </Card.Header>
        <Card.Content>
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
              <Button type="submit" variant="secondary"  isDisabled={!passwordDirty} isPending={passwordSaving} className="flex items-center gap-1.5">
                {passwordSaving ? null : <Shield size={14} />}
                Change Password
              </Button>
              {passwordMessage && (
                <span className={`flex items-center gap-1.5 text-xs ${passwordMessage === 'Password changed' ? 'text-success' : 'text-danger'}`}>
                  {passwordMessage === 'Password changed' ? <Check size={12} /> : <X size={12} />}
                  {passwordMessage}
                </span>
              )}
            </div>
          </form>
        </Card.Content>
      </Card>


    </div>
  );
}
