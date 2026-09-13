'use client';

import { Bell, LogIn, Menu, Search, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { PortalGlobalSearch } from '@/components/portal-global-search';
import { PortalOpsMobileDrawer } from '@/components/portal-ops-mobile-drawer';
import { SiteLogo } from '@/components/site-logo';

type PortalOpsCommandBarProps = {
  userName?: string | null;
  unreadCount: number;
  isSignedIn: boolean;
};

function OpsIconButton({
  label,
  onClick,
  children,
  badge,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="portal-ops-icon-btn relative flex h-9 w-9 items-center justify-center rounded-lg text-white/75 transition-colors hover:bg-white/10 hover:text-white"
    >
      {children}
      {badge != null && badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-accent px-1 text-[9px] font-bold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}

export function PortalOpsCommandBar({
  userName,
  unreadCount,
  isSignedIn,
}: PortalOpsCommandBarProps): ReactNode {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <>
      <header className="portal-ops-command-bar w-full lg:hidden">
        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-3 sm:px-4">
          <a href="/" className="mr-1 shrink-0" aria-label="Home">
            <SiteLogo height={40} />
          </a>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5">
            <OpsIconButton label="Search" onClick={() => setSearchOpen(true)}>
              <Search size={18} />
            </OpsIconButton>
            {isSignedIn && (
              <OpsIconButton
                label="Notifications"
                badge={unreadCount}
                onClick={() => router.push('/notifications')}
              >
                <Bell size={18} />
              </OpsIconButton>
            )}
            {isSignedIn ? (
              <div className="relative">
                <OpsIconButton label="Profile menu" onClick={() => setProfileOpen((v) => !v)}>
                  <User size={18} />
                </OpsIconButton>
                {profileOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Close profile menu"
                      className="fixed inset-0 z-[60]"
                      onClick={() => setProfileOpen(false)}
                    />
                    <div className="absolute right-0 top-full z-[61] mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-brand-navy shadow-xl">
                      {userName && (
                        <p className="truncate border-b border-white/10 px-4 py-2 text-xs text-white/50">
                          {userName}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          router.push('/profile');
                          setProfileOpen(false);
                        }}
                        className="block w-full px-4 py-3 text-left text-sm font-medium text-white/90 hover:bg-white/10"
                      >
                        Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          router.push('/dashboard');
                          setProfileOpen(false);
                        }}
                        className="block w-full px-4 py-3 text-left text-sm font-medium text-white/90 hover:bg-white/10"
                      >
                        Dashboard
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <OpsIconButton label="Sign in" onClick={() => router.push('/login')}>
                <LogIn size={18} />
              </OpsIconButton>
            )}
          </div>

          <OpsIconButton label="Open menu" onClick={() => setDrawerOpen(true)}>
            <Menu size={20} />
          </OpsIconButton>
        </div>
      </header>

      <PortalOpsMobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        userName={userName}
      />
      <PortalGlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
