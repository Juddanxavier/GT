'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Avatar, Button, Chip, Dropdown, Tooltip } from '@heroui/react';
import { LayoutDashboard, Users, Building2, Package, FileText, Receipt, Moon, Sun, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

const ALLOWED_ROLES = ['superadmin', 'tenant-admin', 'staff'];

function NavItems() {
  const items = [
    {
      href: '/',
      label: 'Dashboard',
      icon: <LayoutDashboard size={18} />,
    },
    {
      href: '/customers',
      label: 'Users',
      icon: <Users size={18} />,
    },
    {
      href: '/branches',
      label: 'Branches',
      icon: <Building2 size={18} />,
    },
    {
      href: '/shipments',
      label: 'Shipments',
      icon: <Package size={18} />,
    },
    {
      href: '/quotations',
      label: 'Quotations',
      icon: <FileText size={18} />,
    },
    {
      href: '/invoices',
      label: 'Invoices',
      icon: <Receipt size={18} />,
    },
  ];
  return items;
}



export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') {
      setTheme(stored);
      document.documentElement.setAttribute('data-theme', stored);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (!session) { router.push('/login'); return; }
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (!ALLOWED_ROLES.includes(userRole)) router.push('/unauthorized');
  }, [session, isPending, router]);

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      return next;
    });
  }

  function handleSignOut() {
    authClient.signOut().then(() => router.push('/login'));
  }

  const userRole = (session?.user as Record<string, unknown>)?.role as string | undefined;
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);
  const navItems = useMemo(() => NavItems(), []);

  if (isPending) return <div className="flex items-center justify-center min-h-screen"><p className="text-muted">Loading...</p></div>;
  if (!session || !ALLOWED_ROLES.includes(userRole ?? '')) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-40 border-r border-border bg-surface flex flex-col transition-all md:translate-x-0 ${collapsed ? 'w-14' : 'w-60'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`flex items-center h-14 border-b border-border shrink-0 ${collapsed ? 'justify-center px-0' : 'gap-3 px-5'}`}>
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-accent-foreground text-xs font-bold shrink-0">GT</div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate leading-tight">Gajan Traders</p>
              <p className="text-[11px] text-muted truncate leading-tight">Admin Panel</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const btn = (
              <Button
                key={item.href}
                variant={isActive(item.href) ? 'primary' : 'ghost'}
                className={`${collapsed ? 'w-full justify-center px-0 min-w-0' : 'w-full justify-start'} ${isActive(item.href) ? '' : 'text-foreground'}`}
                onPress={() => { router.push(item.href); setSidebarOpen(false); }}
              >
                <span className={collapsed ? '' : 'mr-2'}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Button>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <Tooltip.Trigger>{btn}</Tooltip.Trigger>
                  <Tooltip.Content placement="right">{item.label}</Tooltip.Content>
                </Tooltip>
              );
            }
            return btn;
          })}
        </nav>

        <div className={`flex items-center border-t border-border ${collapsed ? 'flex-col justify-center py-2 px-0' : 'justify-between px-4 py-3'}`}>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{session.user.name}</p>
              <p className="text-xs text-muted truncate">{session.user.email}</p>
            </div>
          )}
          {!collapsed && (
            <Button size="sm" variant="ghost" onPress={toggleTheme} aria-label="Toggle theme">
              {theme === 'light' ? (
<Moon size={16} />
              ) : (
<Sun size={16} />
              )}
            </Button>
          )}
          <Tooltip>
            <Tooltip.Trigger>
              <Button size="sm" variant="ghost" onPress={toggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                {collapsed ? (
                  <ChevronRight size={16} />
                ) : (
                  <ChevronLeft size={16} />
                )}
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content placement="right">{collapsed ? 'Expand' : 'Collapse'}</Tooltip.Content>
          </Tooltip>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top navbar */}
        <header className="flex items-center justify-between h-14 px-4 sm:px-6 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-3">
            <Button size="sm" variant="ghost" className="md:hidden" onPress={() => setSidebarOpen(true)} aria-label="Open menu">
<Menu size={18} />
            </Button>
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-accent-foreground text-xs font-bold shrink-0 md:hidden">GT</div>
            <p className="text-sm font-semibold md:hidden">Gajan Traders</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 text-xs text-muted">
              <span className="font-medium text-foreground">{(session.user as Record<string, unknown>).tenantName as string || '—'}</span>
              <span className="opacity-40">|</span>
              <span>{(session.user as Record<string, unknown>).branchName as string || 'No Branch'}</span>
              <span className="opacity-40">|</span>
              <Chip size="sm" variant="soft" color="accent" className="h-5">{(userRole as string).replace('-', ' ')}</Chip>
            </div>
            <Dropdown>
              <Dropdown.Trigger className="inline-flex items-center justify-center rounded-full w-8 h-8 hover:bg-muted transition-colors outline-none">
                <Avatar size="sm" color="accent" className="text-xs font-medium">
                  <Avatar.Fallback>{(session.user.name ?? 'U').charAt(0).toUpperCase()}</Avatar.Fallback>
                </Avatar>
              </Dropdown.Trigger>
              <Dropdown.Menu>
                <Dropdown.Section>
                  <div className="px-3 py-2 min-w-0">
                    <p className="text-sm font-medium truncate">{session.user.name}</p>
                    <p className="text-xs text-muted truncate">{session.user.email}</p>
                    <Chip size="sm" variant="soft" color="accent" className="mt-1">{userRole}</Chip>
                  </div>
                </Dropdown.Section>
                <Dropdown.Section>
                  <Dropdown.Item onPress={handleSignOut}>Sign out</Dropdown.Item>
                </Dropdown.Section>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
