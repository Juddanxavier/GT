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

/** Square icon control — one white, lightly-bordered shape for every header action. */
const ICON_BUTTON =
  'size-9 min-w-0 shrink-0 justify-center rounded-xl border border-border bg-content1 text-muted shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:bg-content2 hover:text-foreground';

/** Same square shape for elements that are not HeroUI Buttons (dropdown triggers). */
const ICON_TRIGGER =
  'inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border bg-content1 text-muted shadow-[0_1px_2px_rgba(0,0,0,0.03)] outline-none transition-colors hover:bg-content2 hover:text-foreground';

/** Hairline divider between header clusters. */
function HeaderDivider() {
  return <span aria-hidden="true" className="mx-0.5 hidden h-5 w-px bg-border sm:block" />;
}

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
    <header className="sticky top-0 z-30 shrink-0 border-b border-border bg-background">
      <div className="flex h-16 items-center gap-2 px-4 sm:px-6">
        {/* ── Left: navigation + breadcrumbs ── */}
        <div className="flex min-w-0 items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className={`${ICON_BUTTON} hidden md:inline-flex`}
            onPress={onToggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={`${ICON_BUTTON} md:hidden`}
            onPress={() => setSidebarOpen(true)}
            aria-expanded={sidebarOpen}
            aria-label="Open menu"
          >
            <Menu size={17} />
          </Button>

          <div className="flex items-center gap-2 md:hidden">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              GT
            </div>
            <p className="text-sm font-semibold">Gajan Traders</p>
          </div>

          <div className="hidden min-w-0 md:block">
            <Breadcrumbs />
          </div>
        </div>

        <div className="flex-1" />

        {/* ── Right: search, tenant context, account ── */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="hidden h-9 min-w-0 items-center gap-2 rounded-xl border border-border bg-content1 px-3 text-muted shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:bg-content2 hover:text-foreground sm:inline-flex"
            onPress={onOpenSearch}
            aria-label="Search"
          >
            <Search size={15} />
            <span className="hidden text-xs lg:inline">Search</span>
            <Kbd className="hidden scale-90 lg:inline-flex">
              <Kbd.Abbr keyValue="command" />
              <Kbd.Content>K</Kbd.Content>
            </Kbd>
          </Button>

          {isSuperadmin ? (
            <>
              <HeaderDivider />
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
                <Select.Trigger className="h-9 gap-1.5 rounded-xl border-border text-xs">
                  <Building2 size={14} className="shrink-0 text-muted" />
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="border border-border bg-surface">
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
            </>
          ) : null}

          {userRole === 'tenant-admin' && (
            <>
              <HeaderDivider />
              <span className="hidden items-center gap-1.5 rounded-xl border border-border bg-content1 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:inline-flex">
                <Building2 size={14} className="shrink-0 text-muted" />
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
                <Select.Trigger className="h-9 gap-1.5 rounded-xl border-border text-xs">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="border border-border bg-surface">
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
            <>
              <HeaderDivider />
              <span className="hidden items-center gap-1.5 rounded-xl border border-border bg-content1 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:inline-flex">
                <Building2 size={14} className="shrink-0 text-muted" />
                {sessionUser?.tenantName ?? 'Tenant'}
                <span className="text-muted">&rarr;</span>
                {sessionUser?.branchName ?? 'Branch'}
              </span>
            </>
          )}

          <HeaderDivider />

          <Button
            size="sm"
            variant="ghost"
            className={ICON_BUTTON}
            onPress={onThemeChange}
            aria-label="Toggle theme"
          >
            {resolved === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </Button>

          <Dropdown>
            <Dropdown.Trigger
              className={`relative ${ICON_TRIGGER}`}
              aria-label={
                unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
              }
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Dropdown.Trigger>
            <Dropdown.Popover className="w-80 border border-border bg-surface p-0">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
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
                  <p className="px-3 py-4 text-center text-xs text-muted">No notifications</p>
                ) : (
                  notifs.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className={`flex w-full items-start gap-2 border-b border-border px-3 py-2 text-left text-xs hover:bg-surface-tertiary ${n.read ? '' : 'font-semibold'}`}
                      onClick={() => {
                        if (!n.read) onMarkRead([n.id]);
                        if (n.link) router.push(n.link);
                      }}
                    >
                      <span
                        className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-primary'}`}
                      />
                      <div className="min-w-0">
                        <p className="truncate">{n.title}</p>
                        <p className="truncate font-normal text-muted">{n.message}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </Dropdown.Popover>
          </Dropdown>

          <Dropdown>
            <Dropdown.Trigger className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-content1 px-2 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] outline-none transition-colors hover:bg-content2">
              <Avatar size="sm" className="rounded-full">
                <Avatar.Fallback>{session.user.name.charAt(0).toUpperCase()}</Avatar.Fallback>
              </Avatar>
              <div className="hidden text-left leading-tight sm:block">
                <p className="text-xs font-medium text-foreground">{session.user.name}</p>
                <p className="text-[10px] text-muted">{session.user.email}</p>
              </div>
              <ChevronDown size={14} className="hidden text-muted sm:block" />
            </Dropdown.Trigger>
            <Dropdown.Popover className="border border-border bg-surface">
              <div className="px-3 pt-3 pb-1">
                <div className="flex items-center gap-2">
                  <Avatar size="md" className="rounded-md">
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
                    <LogOut size={14} className="text-danger-soft-foreground" />
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
