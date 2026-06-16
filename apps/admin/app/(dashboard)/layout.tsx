'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Avatar, Button, Chip, Dropdown, Tooltip } from '@heroui/react';
import { LayoutDashboard, Users, Building2, Package, FileText, Receipt, Moon, Sun, ChevronLeft, ChevronRight, Menu, LogOut } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

const ALLOWED_ROLES = ['superadmin', 'tenant-admin', 'staff'];

function NavItems() {
  const items = [
    { href: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { href: '/customers', label: 'Users', icon: <Users size={18} /> },
    { href: '/branches', label: 'Branches', icon: <Building2 size={18} /> },
    { href: '/shipments', label: 'Shipments', icon: <Package size={18} /> },
    { href: '/quotations', label: 'Quotations', icon: <FileText size={18} /> },
    { href: '/invoices', label: 'Invoices', icon: <Receipt size={18} /> },
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

  if (isPending) return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent animate-pulse" />
        <p className="text-sm text-muted">Loading...</p>
      </div>
    </div>
  );
  if (!session || !ALLOWED_ROLES.includes(userRole ?? '')) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed md:static inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 md:translate-x-0 ${collapsed ? 'w-14' : 'w-60'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="relative flex flex-col h-full bg-surface border-r border-border shadow-sm">
          <div className="flex items-center h-16 shrink-0 bg-accent/90 backdrop-blur-sm">
            <div className={`flex items-center ${collapsed ? 'justify-center w-full' : 'gap-3 px-5'}`}>
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">GT</div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate leading-tight text-white">Gajan Traders</p>
                  <p className="text-[11px] text-white/70 truncate leading-tight">Admin Panel</p>
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto pt-3">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const btn = (
                <Button
                  key={item.href}
                  variant="ghost"
                  className={`relative group w-full justify-start transition-all duration-200 ${
                    collapsed ? 'px-0 min-w-0 justify-center' : 'px-3'
                  } ${
                    active
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-foreground/70 hover:text-foreground hover:bg-accent/5'
                  }`}
                  onPress={() => { router.push(item.href); setSidebarOpen(false); }}
                >
                  {active && !collapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-accent" />
                  )}
                  <span className={`${active && collapsed ? 'text-accent' : ''}`}>
                    {item.icon}
                  </span>
                  {!collapsed && <span className="ml-3 text-sm">{item.label}</span>}
                </Button>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <Tooltip.Trigger>{btn}</Tooltip.Trigger>
                    <Tooltip.Content placement="right" className="bg-accent text-white border-0">
                      <p className="text-xs font-medium">{item.label}</p>
                    </Tooltip.Content>
                  </Tooltip>
                );
              }
              return btn;
            })}
          </nav>

          <div className={`border-t border-border bg-accent/[0.02] ${collapsed ? 'flex flex-col items-center py-3 px-0' : 'px-4 py-3'}`}>
            {!collapsed && (
              <div className="flex items-center gap-3 mb-2">
                <Avatar size="sm" color="accent" className="text-xs font-medium shrink-0 ring-2 ring-accent/20">
                  <Avatar.Fallback>{(session.user.name ?? 'U').charAt(0).toUpperCase()}</Avatar.Fallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{session.user.name}</p>
                  <p className="text-[11px] text-muted truncate">{session.user.email}</p>
                </div>
              </div>
            )}
            <div className={`flex ${collapsed ? 'flex-col gap-1' : 'gap-1'}`}>
              <Button size="sm" variant="ghost" onPress={toggleTheme} isIconOnly={collapsed} aria-label="Toggle theme" className={collapsed ? '' : 'flex-1'}>
                {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                {!collapsed && <span className="ml-1.5 text-xs">{theme === 'light' ? 'Dark' : 'Light'}</span>}
              </Button>
              <Button size="sm" variant="ghost" onPress={toggleCollapsed} isIconOnly={collapsed} aria-label={collapsed ? 'Expand' : 'Collapse'} className={collapsed ? '' : 'flex-1'}>
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                {!collapsed && <span className="ml-1.5 text-xs">Collapse</span>}
              </Button>
              <Button size="sm" variant="ghost" onPress={handleSignOut} isIconOnly={collapsed} aria-label="Sign out" className={collapsed ? 'text-danger/70 hover:text-danger' : 'flex-1 text-danger/70 hover:text-danger'}>
                <LogOut size={14} />
                {!collapsed && <span className="ml-1.5 text-xs">Sign out</span>}
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <Button size="sm" variant="ghost" className="md:hidden" onPress={() => setSidebarOpen(true)} aria-label="Open menu">
              <Menu size={18} />
            </Button>
            <div className="w-8 h-8 rounded-xl bg-accent/90 flex items-center justify-center text-white text-xs font-bold shrink-0 md:hidden">GT</div>
            <p className="text-sm font-semibold md:hidden">Gajan Traders</p>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/5 border border-accent/10">
              <span className="font-medium text-foreground">{(session.user as Record<string, unknown>).tenantName as string || '—'}</span>
              <span className="text-muted">/</span>
              <span className="text-muted">{(session.user as Record<string, unknown>).branchName as string || 'No Branch'}</span>
            </div>
            <Chip size="sm" variant="soft" color="accent" className="h-6 capitalize">
              {(userRole as string).replace('-', ' ')}
            </Chip>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" isIconOnly onPress={toggleTheme} aria-label="Toggle theme" className="hidden sm:flex">
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </Button>
            <Dropdown>
              <Dropdown.Trigger className="inline-flex items-center justify-center rounded-full w-9 h-9 hover:bg-accent/10 transition-colors outline-none ring-2 ring-accent/10 hover:ring-accent/30">
                <Avatar size="sm" color="accent" className="text-xs font-medium">
                  <Avatar.Fallback>{(session.user.name ?? 'U').charAt(0).toUpperCase()}</Avatar.Fallback>
                </Avatar>
              </Dropdown.Trigger>
              <Dropdown.Menu>
                <Dropdown.Section>
                  <div className="px-3 py-2 min-w-0">
                    <p className="text-sm font-medium truncate">{session.user.name}</p>
                    <p className="text-xs text-muted truncate">{session.user.email}</p>
                    <Chip size="sm" variant="soft" color="accent" className="mt-1.5 capitalize">{userRole?.replace('-', ' ')}</Chip>
                  </div>
                </Dropdown.Section>
                <Dropdown.Section>
                  <Dropdown.Item onPress={handleSignOut} className="text-danger/70 hover:text-danger">
                    <div className="flex items-center gap-2">
                      <LogOut size={14} />
                      <span>Sign out</span>
                    </div>
                  </Dropdown.Item>
                </Dropdown.Section>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-accent/[0.02] to-transparent">
          {children}
        </main>
      </div>
    </div>
  );
}
