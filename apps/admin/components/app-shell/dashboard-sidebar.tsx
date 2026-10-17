'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Avatar, Button, Tooltip } from '@heroui/react';
import { authClient } from '@/lib/auth-client';
import { isNavActive } from '@/lib/nav-config';
import type { NavItem } from '@/lib/nav-config';

type NavGroup = {
  section: string;
  items: NavItem[];
};

type DashboardSidebarProps = {
  collapsed: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  navGroups: NavGroup[];
  userRole: string;
  session: NonNullable<ReturnType<typeof authClient.useSession>['data']>;
};

export function DashboardSidebar({
  collapsed,
  sidebarOpen,
  setSidebarOpen,
  navGroups,
  userRole,
  session,
}: DashboardSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <aside
      className={`relative fixed md:static inset-y-0 left-0 z-40 border-r border-sidebar-border bg-sidebar flex flex-col transition-all md:translate-x-0 ${collapsed ? 'w-16' : 'w-[190px]'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div
        className={`relative flex items-center h-16 shrink-0 ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-4'}`}
      >
        <div className="relative w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold shrink-0">
          GT
        </div>
        {!collapsed && (
          <div className="relative min-w-0">
            <p className="text-sm font-semibold truncate leading-tight text-sidebar-foreground">
              Gajan Traders
            </p>
            <p className="text-[11px] font-medium text-sidebar-muted truncate leading-tight">
              Admin Panel
            </p>
          </div>
        )}
      </div>

      <nav aria-label="Main navigation" className="flex-1 px-2.5 py-3 overflow-y-auto space-y-4">
        {navGroups.map((group) => {
          if (group.items.length === 0) return null;
          return (
            <div key={group.section} className="space-y-0.5">
              {!collapsed && (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted/70">
                  {group.section}
                </p>
              )}
              {group.items.map((item) => {
                const active = isNavActive(pathname, item.href);
                const Icon = item.icon;
                const btn = (
                  <Button
                    key={item.href}
                    variant="ghost"
                    aria-current={active ? 'page' : undefined}
                    className={`${collapsed ? 'w-full justify-center px-0 min-w-0' : 'w-full justify-start px-3'} h-10 text-sm ${
                      active
                        ? 'bg-sidebar-active-bg text-sidebar-active-fg font-medium'
                        : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground'
                    } rounded-xl border-0 transition-all relative`}
                    onPress={() => {
                      router.push(item.href);
                      setSidebarOpen(false);
                    }}
                  >
                    {active && !collapsed && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-foreground" />
                    )}
                    <span className={`${collapsed ? '' : 'mr-2.5'} ${active ? 'text-sidebar-active-fg' : ''}`}>
                      <Icon size={20} strokeWidth={1.5} />
                    </span>
                    {!collapsed && <span>{item.label}</span>}
                  </Button>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <Tooltip.Trigger className="flex w-full">{btn}</Tooltip.Trigger>
                      <Tooltip.Content placement="right">{item.label}</Tooltip.Content>
                    </Tooltip>
                  );
                }
                return btn;
              })}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {collapsed ? (
          <Tooltip>
            <Tooltip.Trigger className="flex w-full">
              <Button
                variant="ghost"
                className="w-full justify-center px-0 min-w-0 text-sidebar-foreground"
                onPress={() => router.push('/profile')}
              >
                <Avatar size="sm" className="rounded-full">
                  <Avatar.Fallback>{session.user.name.charAt(0).toUpperCase()}</Avatar.Fallback>
                </Avatar>
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content placement="right">Profile</Tooltip.Content>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start gap-2.5 px-2 py-1.5 h-auto rounded-xl text-sidebar-foreground hover:bg-sidebar-hover"
            onPress={() => router.push('/profile')}
          >
            <Avatar size="sm" className="rounded-full shrink-0">
              <Avatar.Fallback>{session.user.name.charAt(0).toUpperCase()}</Avatar.Fallback>
            </Avatar>
            <div className="text-left min-w-0">
              <p className="text-xs font-medium truncate leading-tight text-sidebar-foreground">
                {session.user.name}
              </p>
              <p className="text-[10px] text-sidebar-muted truncate capitalize leading-tight">
                {userRole.replace('-', ' ')}
              </p>
            </div>
          </Button>
        )}
      </div>
    </aside>
  );
}
