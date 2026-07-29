'use client';

import type { ReactNode } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { Button } from '@heroui/react';
import { ErrorBoundary } from '@/components/error-boundary';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/lib/queries';

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
  return <ErrorBoundary><NotificationsPageContent /></ErrorBoundary>;
}
