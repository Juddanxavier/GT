'use client';

import { useRouter } from 'next/navigation';
import {
  Avatar,
  Button,
  Dropdown,
  Kbd,
  Label,
  ListBox,
  Select,
} from '@heroui/react';
import {
  Bell,
  Building2,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sun,
  User,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { authClient } from '@/lib/auth-client';
import type { getUser } from '@/types/auth';

type Tenant = { id: string; name: string };
type Branch = { id: string; name: string };
type Notification = {
  id: string;
  read: boolean;
  title: string;
  message: string;
  link?: string | null;
};

type DashboardHeaderProps = {
  collapsed: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onToggleCollapsed: () => void;
  onOpenSearch: () => void;
  isSuperadmin: boolean;
  userRole: string;
  tenantFilter: string | null;
  branchFilter: string | null;
  tenants: Tenant[];
  branches: Branch[];
  onRequestTenantSwitch: (id: string, name: string) => void;
  onRequestBranchSwitch: (id: string, name: string) => void;
  session: NonNullable<ReturnType<typeof authClient.useSession>['data']>;
  sessionUser: ReturnType<typeof getUser>;
  resolved: 'light' | 'dark';
  onThemeChange: () => void;
  unreadCount: number;
  notifs: Notification[];
  onMarkRead: (ids: string[]) => void;
  onMarkAllRead: () => void;
  onSignOut: () => void;
};

export function DashboardHeader({
  collapsed,
  sidebarOpen,
  setSidebarOpen,
  onToggleCollapsed,
  onOpenSearch,
  isSuperadmin,
  userRole,
  tenantFilter,
  branchFilter,
  tenants,
  branches,
  onRequestTenantSwitch,
  onRequestBranchSwitch,
  session,
  sessionUser,
  resolved,
  onThemeChange,
  unreadCount,
  notifs,
  onMarkRead,
  onMarkAllRead,
  onSignOut,
}: DashboardHeaderProps) {
  const router = useRouter();

  return (
    <header className="glass-topbar border-b border-glass sticky top-0 z-30 shrink-0">
      <div className="flex items-center justify-between h-14 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            className="hidden md:inline-flex"
            onPress={onToggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="md:hidden"
            onPress={() => setSidebarOpen(true)}
            aria-expanded={sidebarOpen}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </Button>
          <div className="w-7 h-7 rounded-lg bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold shrink-0 md:hidden">
            GT
          </div>
          <p className="text-sm font-semibold md:hidden">Gajan Traders</p>
          <div className="hidden md:block">
            <Breadcrumbs />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            size="sm"
            variant="ghost"
            className="hidden sm:inline-flex items-center gap-2 text-muted hover:text-foreground glass-search-trigger h-8 px-2.5 rounded-lg border border-glass"
            onPress={onOpenSearch}
          >
            <Search size={16} />
            <Kbd className="hidden lg:inline-flex scale-90">
              <Kbd.Abbr keyValue="command" />
              <Kbd.Content>K</Kbd.Content>
            </Kbd>
          </Button>

          {isSuperadmin ? (
            <Select
              selectedKey={tenantFilter}
              onSelectionChange={(k) => {
                const id = k as string;
                if (id === tenantFilter) return;
                const name = tenants.find((t) => t.id === id)?.name ?? 'this tenant';
                onRequestTenantSwitch(id, name);
              }}
              className="w-auto min-w-0"
              placeholder="Select tenant"
              aria-label="Filter by tenant"
              variant="secondary"
            >
              <Select.Trigger className="h-8 text-xs border-glass">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {tenants.map((t) => (
                    <ListBox.Item key={t.id} id={t.id} textValue={t.name}>
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-muted" />
                        {t.name}
                      </div>
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          ) : null}

          {userRole === 'tenant-admin' && (
            <>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-glass glass-search-trigger whitespace-nowrap">
                <Building2 size={14} className="text-muted" />
                {sessionUser?.tenantName ?? 'Tenant'}
              </span>
              <Select
                selectedKey={branchFilter}
                onSelectionChange={(k) => {
                  const id = k as string;
                  if (id === branchFilter) return;
                  const name = id
                    ? (branches.find((b) => b.id === id)?.name ?? 'this branch')
                    : 'All Branches';
                  onRequestBranchSwitch(id, name);
                }}
                className="w-auto min-w-0"
                placeholder="All Branches"
                aria-label="Filter by branch"
                variant="secondary"
              >
                <Select.Trigger className="h-8 text-xs border-glass">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="" textValue="All Branches">
                      <div className="flex items-center gap-2">
                        <LayoutDashboard size={16} className="text-muted" />
                        All Branches
                      </div>
                    </ListBox.Item>
                    {branches.map((b) => (
                      <ListBox.Item key={b.id} id={b.id} textValue={b.name}>
                        <div className="flex items-center gap-2">
                          <Building2 size={16} className="text-muted" />
                          {b.name}
                        </div>
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </>
          )}

          {userRole === 'staff' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-glass glass-search-trigger whitespace-nowrap">
              <Building2 size={14} className="text-muted" />
              {sessionUser?.tenantName ?? 'Tenant'}
              <span className="text-muted">&rarr;</span>
              {sessionUser?.branchName ?? 'Branch'}
            </span>
          )}

          <Button
            size="sm"
            variant="ghost"
            onPress={onThemeChange}
            aria-label="Toggle theme"
            className="text-muted hover:text-foreground"
          >
            {resolved === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </Button>

          <Dropdown>
            <Dropdown.Trigger
              className="text-muted hover:text-foreground relative p-1.5 rounded-lg hover:bg-sidebar-hover"
              aria-label={
                unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
              }
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-danger rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Dropdown.Trigger>
            <Dropdown.Popover className="w-80 p-0 glass-panel">
              <div className="flex items-center justify-between px-3 py-2 border-b border-glass">
                <span className="text-xs font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="text-xs text-accent hover:underline"
                    onClick={onMarkAllRead}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifs.length === 0 ? (
                  <p className="text-xs text-muted px-3 py-4 text-center">No notifications</p>
                ) : (
                  notifs.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-xs border-b border-glass hover:bg-sidebar-hover flex items-start gap-2 ${n.read ? '' : 'font-semibold'}`}
                      onClick={() => {
                        if (!n.read) onMarkRead([n.id]);
                        if (n.link) router.push(n.link);
                      }}
                    >
                      <span
                        className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${n.read ? 'bg-transparent' : 'bg-accent'}`}
                      />
                      <div className="min-w-0">
                        <p className="truncate">{n.title}</p>
                        <p className="text-muted font-normal truncate">{n.message}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </Dropdown.Popover>
          </Dropdown>

          <Dropdown>
            <Dropdown.Trigger className="flex items-center gap-2 rounded-lg outline-none hover:bg-sidebar-hover transition-colors px-1 py-1">
              <Avatar size="md" className="rounded-lg">
                <Avatar.Fallback>{session.user.name.charAt(0).toUpperCase()}</Avatar.Fallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline">{session.user.name}</span>
              <ChevronDown size={14} className="text-muted hidden sm:block" />
            </Dropdown.Trigger>
            <Dropdown.Popover className="glass-panel">
              <div className="px-3 pt-3 pb-1">
                <div className="flex items-center gap-2">
                  <Avatar size="md" className="rounded-lg">
                    <Avatar.Fallback>{session.user.name.charAt(0).toUpperCase()}</Avatar.Fallback>
                  </Avatar>
                  <div className="flex flex-col gap-0">
                    <p className="text-sm leading-5 font-medium">{session.user.name}</p>
                    <p className="text-xs leading-none text-muted">{session.user.email}</p>
                  </div>
                </div>
              </div>
              <Dropdown.Menu>
                <Dropdown.Item id="profile" textValue="Profile" onPress={() => router.push('/profile')}>
                  <User size={16} />
                  <Label>Profile</Label>
                </Dropdown.Item>
                <Dropdown.Item id="signout" textValue="Sign out" variant="danger" onPress={onSignOut}>
                  <div className="flex w-full items-center justify-between gap-2">
                    <Label>Sign out</Label>
                    <LogOut size={14} className="text-danger" />
                  </div>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
