'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { ErrorBoundary } from '@/components/error-boundary';
import { ToastProvider } from '@/components/toast';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { SearchDialog } from '@/components/search-dialog';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import {
  Avatar,
  Button,
  Dropdown,
  Kbd,
  Label,
  Select,
  ListBox,
  Switch,
  Tooltip,
} from '@heroui/react';
import { Modal } from '@heroui/react/modal';
import {
  Activity,
  BarChart3,
  HelpCircle,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Users,
  Building2,
  Package,
  Receipt,
  Moon,
  Sun,
  ChevronDown,
  Bell,
  LogOut,
  Menu,
  User,
  UserPlus,
  Settings as SettingsIcon,
  DollarSign,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { TenantFilterProvider, useTenantFilter } from '@/lib/tenant-filter-context';
import { useTheme } from '@/lib/use-theme';
import {
  useTenants,
  useDashboardBranches,
  useUnreadCount,
  useNotifications,
  useMarkRead,
  useMarkAllRead,
} from '@/lib/queries';
import { useToast } from '@/components/toast';
import { connectSocket } from '@/lib/socket';
import { getUser } from '@/types/auth';

const ALLOWED_ROLES = ['superadmin', 'tenant-admin', 'staff'];

type NavItem = { href: string; label: string; icon: ReactNode };

function getNavItems(role?: string): { section: string; items: NavItem[] }[] {
  const manage: NavItem[] = [
    { href: '/customers', label: 'Users', icon: <Users size={18} /> },
  ];
  if (role !== 'staff') {
    manage.push({ href: '/invitations', label: 'Invitations', icon: <UserPlus size={18} /> });
    manage.push({ href: '/branches', label: 'Branches', icon: <Building2 size={18} /> });
  }
  manage.push({ href: '/shipments', label: 'Shipments', icon: <Package size={18} /> });
  manage.push({ href: '/invoices', label: 'Invoices', icon: <Receipt size={18} /> });
  if (role !== 'staff') {
    manage.push({ href: '/rate-cards', label: 'Rate Cards', icon: <DollarSign size={18} /> });
  }

  const insights: NavItem[] = [];
  if (role !== 'staff') {
    insights.push({ href: '/reports', label: 'Reports', icon: <BarChart3 size={18} /> });
  }
  insights.push({ href: '/audit', label: 'Audit Log', icon: <Activity size={18} /> });

  const system: NavItem[] = [];
  if (role !== 'staff') {
    system.push({ href: '/settings', label: 'Settings', icon: <SettingsIcon size={18} /> });
  }

  return [
    { section: 'Overview', items: [{ href: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> }] },
    { section: 'Manage', items: manage },
    { section: 'Insights', items: insights },
    { section: 'System', items: system },
  ];
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
      gcTime: 1000 * 60 * 30,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'GT_QUERY_CACHE',
});

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, isPending, error } = authClient.useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (error) return;
    if (!session) {
      router.push('/login');
      return;
    }
    const userRole = getUser(session)!.role;
    if (!ALLOWED_ROLES.includes(userRole)) router.push('/unauthorized');
  }, [session, isPending, error, router]);

  const userRole = getUser(session)?.role;

  if (isPending)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted">Loading...</p>
      </div>
    );
  if (!session) return null;
  if (!ALLOWED_ROLES.includes(userRole ?? '')) {
    router.push('/unauthorized');
    return null;
  }

  const isSuperadmin = userRole === 'superadmin';

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 30 }}
    >
      <TenantFilterProvider>
        <ToastProvider>
          <DashboardLayoutInner
            isSuperadmin={isSuperadmin}
            session={session}
            userRole={userRole!}
            sidebarOpen={sidebarOpen}
            collapsed={collapsed}
            setSidebarOpen={setSidebarOpen}
            setCollapsed={setCollapsed}
          >
            {children}
          </DashboardLayoutInner>
        </ToastProvider>
      </TenantFilterProvider>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </PersistQueryClientProvider>
  );
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function useIdleTimeout() {
  const router = useRouter();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function reset() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        localStorage.removeItem('GT_QUERY_CACHE');
        authClient.signOut().then(() => router.push('/login'));
      }, SESSION_TIMEOUT_MS);
    }
    const events = ['mousedown', 'keydown', 'mousemove', 'touchstart', 'scroll'] as const;
    for (const e of events) document.addEventListener(e, reset);
    reset();
    return () => {
      clearTimeout(timer);
      for (const e of events) document.removeEventListener(e, reset);
    };
  }, [router]);
}

function DashboardLayoutInner({
  children,
  isSuperadmin,
  session,
  userRole,
  sidebarOpen,
  collapsed,
  setSidebarOpen,
  setCollapsed,
}: {
  children: ReactNode;
  isSuperadmin: boolean;
  session: NonNullable<ReturnType<typeof authClient.useSession>['data']>;
  userRole: string;
  sidebarOpen: boolean;
  collapsed: boolean;
  setSidebarOpen: (v: boolean) => void;
  setCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { tenantFilter, branchFilter, setTenant, setBranch } = useTenantFilter();
  const { data: tenants = [] } = useTenants();
  const { data: branches = [] } = useDashboardBranches();
  const [confirmTenant, setConfirmTenant] = useState<{ id: string; name: string } | null>(null);
  const [confirmBranch, setConfirmBranch] = useState<{ id: string; name: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const navGroups = useMemo(() => getNavItems(userRole), [userRole]);
  const { toast } = useToast();

  const { resolved, setTheme } = useTheme();

  useEffect(() => {
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.state.status === 'error') {
        const err = event.query.state.error;
        if (err)
          toast('error', 'Failed to load data', err instanceof Error ? err.message : undefined);
      }
    });
  }, [toast]);

  useIdleTimeout();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (
        (e.key === '?' || e.key === '/') &&
        !e.metaKey &&
        !e.ctrlKey &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isSuperadmin && tenants.length > 0 && !tenantFilter && tenants[0]) {
      setTenant(tenants[0].id);
    }
  }, [isSuperadmin, tenants, tenantFilter, setTenant]);

  const { data: unreadData } = useUnreadCount();
  const { data: notifData } = useNotifications({ limit: 10 });
  const unreadCount = unreadData?.count ?? 0;
  const notifs = notifData?.data ?? [];
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  useEffect(() => {
    const tenantId = getUser(session)?.tenantId;
    if (!tenantId) return;
    const socket = connectSocket(tenantId);
    const notifHandler = () => queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    socket.on('notification:new', notifHandler);
    // Real-time toast on tracking update
    const trackHandler = (data: { shipmentId: string; trackingNo: string; status: string }) => {
      toast('info', `Shipment ${data.trackingNo}: ${data.status}`, 'Tracking status updated');
    };
    socket.on('tracking:updated', trackHandler);
    return () => {
      socket.off('notification:new', notifHandler);
      socket.off('tracking:updated', trackHandler);
    };
  }, [session, toast]);

  function handleThemeChange() {
    setTheme(resolved === 'dark' ? 'light' : 'dark');
  }

  function handleSignOut() {
    localStorage.removeItem('tenantFilter');
    localStorage.removeItem('branchFilter');
    // Persisted React Query cache holds the previous tenant's data — clear it.
    localStorage.removeItem('GT_QUERY_CACHE');
    authClient.signOut().then(() => router.push('/login'));
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      return next;
    });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-surface focus:text-foreground focus:rounded-lg focus:border focus:border-border focus:text-sm"
      >
        Skip to content
      </a>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`relative fixed md:static inset-y-0 left-0 z-40 border-r bg-sidebar flex flex-col transition-all md:translate-x-0 ${collapsed ? 'w-14' : 'w-60'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ borderColor: 'var(--sidebar-border)' }}
      >
        <div className={`relative flex items-center h-16 shrink-0 ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'}`} style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
          <div className="relative w-9 h-9 rounded-sm bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold shrink-0">
            GT
          </div>
          {!collapsed && (
            <div className="relative min-w-0">
              <p className="text-sm font-semibold truncate leading-tight text-sidebar-foreground">Gajan Traders</p>
              <p className="text-[11px] font-medium text-sidebar-muted truncate leading-tight">Admin Panel</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-2 overflow-y-auto space-y-1">
          {navGroups.map((group) => {
            if (group.items.length === 0) return null;
            return (
              <div key={group.section} className="space-y-0.5">
                {!collapsed && (
                  <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted/60">
                    {group.section}
                  </p>
                )}
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const btn = (
                    <Button
                      key={item.href}
                      variant="ghost"
                      className={`${collapsed ? 'w-full justify-center px-0 min-w-0' : 'w-full justify-start px-3'} h-9 ${active ? 'bg-sidebar-active-bg text-sidebar-active-fg font-medium' : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground'} rounded-lg border border-transparent transition-all relative`}
                      onPress={() => {
                        router.push(item.href);
                        setSidebarOpen(false);
                      }}
                    >
                      {active && !collapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-sidebar-active-fg" />
                      )}
                      <span className={`${collapsed ? '' : 'mr-2.5'} ${active ? 'text-sidebar-active-fg' : ''}`}>{item.icon}</span>
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

        <div className="p-2" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
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
              className="w-full justify-start gap-2.5 px-2 py-1.5 h-auto text-sidebar-foreground"
              onPress={() => router.push('/profile')}
            >
              <Avatar size="sm" className="rounded-full shrink-0">
                <Avatar.Fallback>{session.user.name.charAt(0).toUpperCase()}</Avatar.Fallback>
              </Avatar>
              <div className="text-left min-w-0">
                <p className="text-xs font-medium truncate leading-tight text-sidebar-foreground">{session.user.name}</p>
                <p className="text-[10px] text-sidebar-muted truncate capitalize leading-tight">
                  {userRole.replace('-', ' ')}
                </p>
              </div>
            </Button>
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-auto">
        {/* Top navbar */}
        <header className="border-b border-border bg-surface sticky top-0 z-20 shrink-0">
          <div className="flex items-center justify-between h-14 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="ghost"
                className="hidden md:inline-flex"
                onPress={toggleCollapsed}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="md:hidden"
                onPress={() => setSidebarOpen(true)}
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

            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="ghost"
                className="hidden sm:inline-flex items-center gap-2 text-muted hover:text-foreground"
                onPress={() => setSearchOpen(true)}
              >
                <Search size={16} />
                <Kbd className="hidden lg:inline-flex">
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
                    setConfirmTenant({ id, name });
                  }}
                  className="w-auto min-w-0"
                  placeholder="Select tenant"
                  aria-label="Filter by tenant"
                  variant="secondary"
                >
                  <Select.Trigger className="h-8 text-xs">
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
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-muted/10 text-xs font-medium text-foreground border border-border whitespace-nowrap">
                    <Building2 size={14} className="text-muted" />
                    {getUser(session)?.tenantName ?? 'Tenant'}
                  </span>
                  <Select
                    selectedKey={branchFilter}
                    onSelectionChange={(k) => {
                      const id = k as string;
                      if (id === branchFilter) return;
                      const name = id
                        ? (branches.find((b) => b.id === id)?.name ?? 'this branch')
                        : 'All Branches';
                      setConfirmBranch({ id, name });
                    }}
                    className="w-auto min-w-0"
                    placeholder="All Branches"
                    aria-label="Filter by branch"
                    variant="secondary"
                  >
                    <Select.Trigger className="h-8 text-xs">
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
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-muted/10 text-xs font-medium text-foreground border border-border whitespace-nowrap">
                  <Building2 size={14} className="text-muted" />
                  {getUser(session)?.tenantName ?? 'Tenant'}
                  <span className="text-muted">&rarr;</span>
                  {getUser(session)?.branchName ?? 'Branch'}
                </span>
              )}
              <Button
                size="sm"
                variant="ghost"
                onPress={() => handleThemeChange()}
                aria-label="Toggle theme"
                className="text-muted hover:text-foreground"
              >
                {resolved === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </Button>
              <Dropdown>
                <Dropdown.Trigger
                  className="text-muted hover:text-foreground relative"
                  aria-label="Notifications"
                >
                  <Bell size={16} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-danger rounded-full">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Dropdown.Trigger>
                <Dropdown.Popover className="w-80 p-0">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                    <span className="text-xs font-semibold">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        className="text-xs text-primary hover:underline"
                        onClick={() => markAllRead.mutate()}
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
                          className={`w-full text-left px-3 py-2 text-xs border-b border-border hover:bg-muted/20 flex items-start gap-2 ${n.read ? '' : 'font-semibold'}`}
                          onClick={() => {
                            if (!n.read) {
                              markRead.mutate({ ids: [n.id] });
                            }
                            if (n.link) router.push(n.link);
                          }}
                        >
                          <span
                            className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${n.read ? 'bg-transparent' : 'bg-primary'}`}
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
                <Dropdown.Trigger className="flex items-center gap-2 rounded-full outline-none hover:bg-muted transition-colors px-1 py-1">
                  <Avatar size="md" className="rounded-full">
                    <Avatar.Fallback>{session.user.name.charAt(0).toUpperCase()}</Avatar.Fallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:inline">{session.user.name}</span>
                  <ChevronDown size={14} className="text-muted hidden sm:block" />
                </Dropdown.Trigger>
                <Dropdown.Popover>
                  <div className="px-3 pt-3 pb-1">
                    <div className="flex items-center gap-2">
                      <Avatar size="md" className="rounded-full">
                        <Avatar.Fallback>
                          {session.user.name.charAt(0).toUpperCase()}
                        </Avatar.Fallback>
                      </Avatar>
                      <div className="flex flex-col gap-0">
                        <p className="text-sm leading-5 font-medium">{session.user.name}</p>
                        <p className="text-xs leading-none text-muted">{session.user.email}</p>
                      </div>
                    </div>
                  </div>
                  <Dropdown.Menu>
                    <Dropdown.Item
                      id="profile"
                      textValue="Profile"
                      onPress={() => router.push('/profile')}
                    >
                      <User size={16} />
                      <Label>Profile</Label>
                    </Dropdown.Item>
                    <Dropdown.Item
                      id="signout"
                      textValue="Sign out"
                      variant="danger"
                      onPress={handleSignOut}
                    >
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

        {/* Tenant switch confirmation */}
        <Modal.Backdrop
          isOpen={!!confirmTenant}
          onOpenChange={(open) => {
            if (!open) setConfirmTenant(null);
          }}
        >
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>Switch Tenant</Modal.Header>
              <Modal.Body>
                <p className="text-sm text-muted">
                  Switch to <strong>{confirmTenant?.name}</strong>? Data on all pages will refresh
                  to show that tenant's information.
                </p>
              </Modal.Body>
              <Modal.Footer className="flex gap-2">
                <Button variant="ghost" onPress={() => setConfirmTenant(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onPress={() => {
                    if (confirmTenant) setTenant(confirmTenant.id);
                    setConfirmTenant(null);
                  }}
                >
                  Switch
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>

        {/* Branch switch confirmation */}
        <Modal.Backdrop
          isOpen={!!confirmBranch}
          onOpenChange={(open) => {
            if (!open) setConfirmBranch(null);
          }}
        >
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>Switch Branch</Modal.Header>
              <Modal.Body>
                <p className="text-sm text-muted">
                  Switch to <strong>{confirmBranch?.name}</strong>? Data on all pages will refresh
                  to show that branch's information.
                </p>
              </Modal.Body>
              <Modal.Footer className="flex gap-2">
                <Button variant="ghost" onPress={() => setConfirmBranch(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onPress={() => {
                    if (confirmBranch) setBranch(confirmBranch.id);
                    setConfirmBranch(null);
                  }}
                >
                  Switch
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>

        <SearchDialog isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

        <main id="main-content" className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
        <footer className="border-t border-border px-6 py-3 text-xs text-muted flex items-center justify-between shrink-0">
          <span>© {new Date().getFullYear()} Gajan Traders. All rights reserved.</span>
          <span>v1.0.0</span>
        </footer>
      </div>
    </div>
  );
}
