'use client';

import type { ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Package, FileText, Receipt, Bell, User, LogOut, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@heroui/react';
import { authClient } from '@/lib/auth-client';
import { useTenantConfig } from '@/lib/use-tenant-config';
import { useUnreadCount } from '@/lib/queries';

export function PortalNav(): ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const config = useTenantConfig();
  const { data: session } = authClient.useSession();
  const { data: unreadData } = useUnreadCount();

  const isEmerald = config.theme === 'emerald';
  const logoBg = isEmerald ? 'bg-emerald-600' : 'bg-violet-600';
  const linkHover = isEmerald ? 'hover:text-emerald-700' : 'hover:text-violet-700';
  const activeLink = isEmerald ? 'text-emerald-700' : 'text-violet-700';

  return (
    <header className="border-b border-separator bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-4">
          <a href="/" className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${logoBg} text-white text-sm font-bold`}>
              {config.shortName}
            </div>
            <span className="text-lg font-semibold text-foreground hidden sm:inline">{config.name}</span>
          </a>
        </div>

        <nav className="flex items-center gap-1">
          {session ? (
            <>
              <a
                href="/my-shipments"
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  pathname.startsWith('/my-shipments') ? activeLink : 'text-muted hover:text-foreground'
                }`}
              >
                <Package size={16} />
                <span className="hidden sm:inline">My Shipments</span>
              </a>
              <a
                href="/my-quotations"
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  pathname.startsWith('/my-quotations') || pathname.startsWith('/quotations') ? activeLink : 'text-muted hover:text-foreground'
                }`}
              >
                <FileText size={16} />
                <span className="hidden sm:inline">Quotations</span>
              </a>
              <a
                href="/my-invoices"
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  pathname.startsWith('/my-invoices') || pathname.startsWith('/invoices') ? activeLink : 'text-muted hover:text-foreground'
                }`}
              >
                <Receipt size={16} />
                <span className="hidden sm:inline">Invoices</span>
              </a>
              <a
                href="/notifications"
                className={`relative inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  pathname === '/notifications' ? activeLink : 'text-muted hover:text-foreground'
                }`}
              >
                <Bell size={16} />
                {(unreadData?.count ?? 0) > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
                    {unreadData!.count > 9 ? '9+' : unreadData!.count}
                  </span>
                )}
                <span className="hidden sm:inline">Notifications</span>
              </a>
              <a
                href="/profile"
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  pathname === '/profile' ? activeLink : 'text-muted hover:text-foreground'
                }`}
              >
                <User size={16} />
                <span className="hidden sm:inline">Profile</span>
              </a>
              <Button
                variant="ghost"
                size="sm"
                onPress={async () => {
                  await authClient.signOut();
                  router.push('/');
                }}
                className="ml-1"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </>
          ) : (
            <>
              <a
                href="/login"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted hover:text-foreground rounded-lg transition-colors"
              >
                <LogIn size={16} />
                <span className="hidden sm:inline">Sign in</span>
              </a>
              <a
                href="/register"
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all ${isEmerald ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-violet-600 hover:bg-violet-700'} ml-1`}
              >
                <UserPlus size={16} />
                <span className="hidden sm:inline">Register</span>
              </a>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
