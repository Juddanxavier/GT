'use client';

import type { ReactNode } from 'react';
import { Bell, Check, CheckCheck, Mail, MessageCircle } from 'lucide-react';
import { Button } from '@heroui/react';
import { ErrorBoundary } from '@/components/error-boundary';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useNotificationPrefs,
  useUpdateNotificationPrefs,
  type NotificationPrefs,
} from '@/lib/queries';

const PREF_ROWS: { category: 'delivery' | 'exception' | 'general'; label: string; desc: string }[] = [
  { category: 'delivery', label: 'Delivery updates', desc: 'Out for delivery and delivered' },
  { category: 'exception', label: 'Exceptions', desc: 'Delays or delivery issues' },
  { category: 'general', label: 'General updates', desc: 'Registered and in-transit updates' },
];

function PrefsSection(): ReactNode {
  const { data: prefs = {}, isLoading } = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();

  if (isLoading) return null;

  const channel = (user: NotificationPrefs, field: keyof NotificationPrefs): boolean =>
    user[field] ?? true;

  const setPref = (field: keyof NotificationPrefs) => {
    update.mutate({ [field]: !channel(prefs as NotificationPrefs, field) });
  };

  return (
    <div className="rounded-2xl bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Bell size={16} className="text-[#F59E0B]" />
        <h2 className="text-sm font-bold text-foreground">Notification Preferences</h2>
      </div>
      <p className="text-xs text-foreground/50">Choose how you want to hear about your shipments.</p>
      <div className="space-y-4">
        {PREF_ROWS.map((row) => (
          <div key={row.category} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">{row.label}</p>
              <p className="text-xs text-foreground/50">{row.desc}</p>
            </div>
            <div className="flex items-center gap-4">
              {(
                [
                  ['email', Mail, `${row.category}Email`],
                  ['whatsapp', MessageCircle, `${row.category}Whatsapp`],
                ] as const
              ).map(([ch, Icon, field]) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setPref(field as keyof NotificationPrefs)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    channel(prefs as NotificationPrefs, field as keyof NotificationPrefs)
                      ? 'bg-[#F59E0B] text-white'
                      : 'bg-foreground/5 text-foreground/50 hover:bg-foreground/10'
                  }`}
                  aria-pressed={channel(prefs as NotificationPrefs, field as keyof NotificationPrefs)}
                >
                  <Icon size={13} />
                  {ch}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationsPageContent(): ReactNode {
  const { data: notifData, isLoading, error } = useNotifications();

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = notifData?.data ?? [];
  const unread = notifications.filter((n) => !n.read);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#F94735]/10 text-[#F94735] flex items-center justify-center">
            <Bell size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Notifications</h1>
            <p className="text-foreground/50 mt-0.5">Stay updated on your shipment activity.</p>
          </div>
        </div>
        {unread.length > 0 && (
          <Button size="sm" variant="ghost" onPress={() => markAllRead.mutate()} isPending={markAllRead.isPending}>
            <CheckCheck size={14} /> Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-center text-foreground/50 py-10">Loading...</p>
      ) : error ? (
        <div className="rounded-xl bg-red-50 p-6 text-center"><p className="text-danger">Failed to load notifications.</p></div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20">
          <Bell size={40} className="mx-auto text-foreground/20" />
          <p className="text-foreground/50 mt-4">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl bg-white p-5 flex items-start gap-3 transition-all ${
                n.read ? 'shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]' : 'shadow-[0_1px_3px_0_rgba(249,71,53,0.12)]'
              }`}
            >
              <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-transparent' : 'bg-[#F94735]'}`} />
              <div className="flex-1 min-w-0">
                <p className={`${n.read ? 'text-foreground/50' : 'text-foreground font-medium'}`}>{n.title}</p>
                <p className="text-xs text-foreground/50 mt-0.5">{n.message}</p>
                <p className="text-xs text-foreground/30 mt-1">{new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              {!n.read && (
                <Button isIconOnly size="sm" variant="ghost" aria-label="Mark read" onPress={() => markRead.mutate(n.id)} isPending={markRead.isPending}>
                  <Check size={14} />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage(): ReactNode {
  return (
    <ErrorBoundary>
      <NotificationsPageContent />
      <div className="mt-6"><PrefsSection /></div>
    </ErrorBoundary>
  );
}
