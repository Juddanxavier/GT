'use client';

import type { ReactNode } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { Button } from '@heroui/react';
import { ErrorBoundary } from '@/components/error-boundary';
import { authClient } from '@/lib/auth-client';
import { useTenantConfig } from '@/lib/use-tenant-config';
import { useNotifications, useUnreadCount, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/lib/queries';

function NotificationsPageContent(): ReactNode {
  const config = useTenantConfig();
  const { data: session } = authClient.useSession();
  const { data: notifData, isLoading, error } = useNotifications();
  const isEmerald = config.theme === 'emerald';

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  if (!session) return <p className="text-center text-muted py-20">Sign in to view notifications.</p>;

  const notifications = notifData?.data ?? [];
  const unread = notifications.filter((n) => !n.read);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        {unread.length > 0 && (
          <Button size="sm" variant="ghost" onPress={() => markAllRead.mutate()} className="text-xs" isPending={markAllRead.isPending}>
            <CheckCheck size={14} /> Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-center text-muted py-10">Loading...</p>
      ) : error ? (
        <div className="rounded-xl border border-danger/20 bg-danger/10 p-6 text-center"><p className="text-sm text-danger">Failed to load notifications.</p></div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20">
          <Bell size={40} className="mx-auto text-muted/40" />
          <p className="text-muted mt-4">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border p-4 flex items-start gap-3 transition-colors ${
                n.read ? 'border-border bg-surface' : 'border-border bg-surface-secondary'
              }`}
            >
              <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-transparent' : isEmerald ? 'bg-emerald-500' : 'bg-violet-500'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.read ? 'text-muted' : 'text-foreground font-medium'}`}>{n.title}</p>
                <p className="text-xs text-muted mt-0.5">{n.message}</p>
                <p className="text-xs text-muted/60 mt-1">{new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
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
  return <ErrorBoundary><NotificationsPageContent /></ErrorBoundary>;
}
