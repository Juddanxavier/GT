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

  const accentClass = config.theme === 'emerald' ? 'text-emerald-600' : 'text-violet-600';
  const accentBorder = config.theme === 'emerald' ? 'border-emerald-600' : 'border-violet-600';

  return (
    <header className="border-b border-border bg-surface/90 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <a href="/" className="flex items-center gap-2">
          <span className={`text-base font-bold tracking-tight ${accentClass}`}>
            {config.shortName}
          </span>
        </a>

        <nav className="flex items-center gap-0.5">
          {session ? (
            <>
              <NavLink href="/my-shipments" icon={<Package size={15} />} label="My Shipments" pathname={pathname} />
              <NavLink href="/my-quotations" icon={<FileText size={15} />} label="Quotations" pathname={pathname} />
              <NavLink href="/my-invoices" icon={<Receipt size={15} />} label="Invoices" pathname={pathname} />
              <NavLink
                href="/notifications"
                icon={<Bell size={15} />}
                label="Notifications"
                pathname={pathname}
                badge={unreadData?.count ?? 0}
              />
              <NavLink href="/profile" icon={<User size={15} />} label="Profile" pathname={pathname} />
              <Button
                variant="light"
                size="sm"
                onPress={async () => {
                  await authClient.signOut();
                  router.push('/');
                }}
                className="ml-1 text-muted hover:text-foreground data-[hover=true]:bg-surface-secondary min-w-0 px-2"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline text-xs">Sign out</span>
              </Button>
            </>
          ) : (
            <>
              <a
                href="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground rounded-lg transition-colors"
              >
                <LogIn size={15} />
                <span className="hidden sm:inline">Sign in</span>
              </a>
              <a
                href="/register"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-all ${config.theme === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-violet-600 hover:bg-violet-700'} ml-1`}
              >
                <UserPlus size={15} />
                <span className="hidden sm:inline">Register</span>
              </a>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, icon, label, pathname, badge }: { href: string; icon: ReactNode; label: string; pathname: string; badge?: number }): ReactNode {
  const isActive = pathname.startsWith(href.replace(/\/$/, ''));
  const accentClass = useTenantConfig().theme === 'emerald' ? 'text-emerald-600' : 'text-violet-600';

  return (
    <a
      href={href}
      className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
          isActive
            ? `${accentClass} bg-surface-secondary`
            : 'text-muted hover:text-foreground hover:bg-surface-secondary/50'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {(badge ?? 0) > 0 && (
        <span className="flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white leading-none">
          {badge! > 9 ? '9+' : badge}
        </span>
      )}
    </a>
  );
}
