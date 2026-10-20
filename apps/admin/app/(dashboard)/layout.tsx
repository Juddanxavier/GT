'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { ToastProvider } from '@/components/toast';
import { SearchDialog } from '@/components/search-dialog';
import { CACHE_KEY, QueryProvider, queryClient } from '@/components/app-shell/query-provider';
import { useIdleTimeout } from '@/components/app-shell/use-idle-timeout';
import { DashboardSidebar } from '@/components/app-shell/dashboard-sidebar';
import { DashboardHeader } from '@/components/app-shell/dashboard-header';
import { FilterConfirmModals } from '@/components/app-shell/filter-confirm-modals';
import { authClient } from '@/lib/auth-client';
import { TenantFilterProvider, useTenantFilter } from '@/lib/tenant-filter-context';
import { useTheme } from '@/lib/use-theme';
import { getNavSections } from '@/lib/nav-config';
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

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, isPending, error } = authClient.useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      if (saved === 'true') setCollapsed(true);
    }
  }, []);

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
      <div className="flex items-center justify-center min-h-screen bg-background">
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
    <QueryProvider>
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
    </QueryProvider>
  );
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
  const { tenantFilter, branchFilter, setTenant, setBranch } = useTenantFilter();
  const { data: tenants = [] } = useTenants();
  const { data: branches = [] } = useDashboardBranches();
  const [confirmTenant, setConfirmTenant] = useState<{ id: string; name: string } | null>(null);
  const [confirmBranch, setConfirmBranch] = useState<{ id: string; name: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const navGroups = useMemo(
    () => getNavSections(userRole).map((s) => ({ section: s.label, items: s.items })),
    [userRole],
  );
  const { toast } = useToast();
  const { resolved, setTheme } = useTheme();
  const sessionUser = getUser(session);

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

  // AC-8: move focus to the new page after a client side navigation so screen
  // readers announce the change. The first render is skipped, because the
  // initial focus belongs to the browser.
  const pathname = usePathname();
  const skippedFirstRouteFocus = useRef(true);
  useEffect(() => {
    if (skippedFirstRouteFocus.current) {
      skippedFirstRouteFocus.current = false;
      return;
    }
    document.getElementById('main-content')?.focus();
  }, [pathname]);

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
    const tenantId = sessionUser?.tenantId;
    if (!tenantId) return;
    const socket = connectSocket(tenantId);
    const notifHandler = () => queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    socket.on('notification:new', notifHandler);
    const trackHandler = (data: { shipmentId: string; trackingNo: string; status: string }) => {
      toast('info', `Shipment ${data.trackingNo}: ${data.status}`, 'Tracking status updated');
      // The worker updates rows out of band; pull the list and open detail back
      // so the board reflects the new status without a manual reload.
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['shipment', data.shipmentId] });
      queryClient.invalidateQueries({ queryKey: ['shipment-tracking', data.shipmentId] });
      queryClient.invalidateQueries({ queryKey: ['shipment-trend'] });
    };
    socket.on('tracking:updated', trackHandler);
    return () => {
      socket.off('notification:new', notifHandler);
      socket.off('tracking:updated', trackHandler);
    };
  }, [session, toast, queryClient, sessionUser?.tenantId]);

  function handleThemeChange() {
    setTheme(resolved === 'dark' ? 'light' : 'dark');
  }

  function handleSignOut() {
    localStorage.removeItem('tenantFilter');
    localStorage.removeItem('branchFilter');
    localStorage.removeItem(CACHE_KEY);
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
    <div className="flex h-[100dvh] flex-col bg-page text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-surface focus:border focus:border-border focus:text-foreground focus:rounded-lg focus:text-sm"
      >
        Skip to content
      </a>

      <div className="relative flex min-h-0 flex-1 overflow-hidden bg-background md:m-3 md:rounded-[28px] md:shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close navigation menu"
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <DashboardSidebar
          collapsed={collapsed}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          navGroups={navGroups}
          userRole={userRole}
          session={session}
        />

        <div className="flex flex-col flex-1 min-w-0 overflow-auto">
          <DashboardHeader
            collapsed={collapsed}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            onToggleCollapsed={toggleCollapsed}
            onOpenSearch={() => setSearchOpen(true)}
            isSuperadmin={isSuperadmin}
            userRole={userRole}
            tenantFilter={tenantFilter}
            branchFilter={branchFilter}
            tenants={tenants}
            branches={branches}
            onRequestTenantSwitch={(id, name) => setConfirmTenant({ id, name })}
            onRequestBranchSwitch={(id, name) => setConfirmBranch({ id, name })}
            session={session}
            sessionUser={sessionUser}
            resolved={resolved}
            onThemeChange={handleThemeChange}
            unreadCount={unreadCount}
            notifs={notifs}
            onMarkRead={(ids) => markRead.mutate({ ids })}
            onMarkAllRead={() => markAllRead.mutate()}
            onSignOut={handleSignOut}
          />

          <FilterConfirmModals
            confirmTenant={confirmTenant}
            setConfirmTenant={setConfirmTenant}
            onConfirmTenant={setTenant}
            confirmBranch={confirmBranch}
            setConfirmBranch={setConfirmBranch}
            onConfirmBranch={setBranch}
          />

          <SearchDialog isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

          <main id="main-content" tabIndex={-1} aria-label="Main content" className="p-5 sm:p-7 lg:p-10">
            <div className="mx-auto w-full max-w-7xl">
              <ErrorBoundary>{children}</ErrorBoundary>
            </div>
          </main>

          <footer className="px-5 sm:px-7 lg:px-10 py-3 text-[11px] text-muted flex items-center justify-between shrink-0">
            <span>© {new Date().getFullYear()} Gajan Traders. All rights reserved.</span>
            <span>v1.0.0</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
