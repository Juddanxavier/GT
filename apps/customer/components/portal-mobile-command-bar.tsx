'use client';

import { Bell, LogIn, Menu, Search, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { PortalGlobalSearch } from '@/components/portal-global-search';
import { PortalMobileDrawer } from '@/components/portal-mobile-drawer';
import { SiteLogo } from '@/components/site-logo';

type PortalMobileCommandBarProps = {
  hasMarquee: boolean;
  heroMode: boolean;
  isSignedIn: boolean;
  userName?: string | null;
  unreadCount: number;
};

function MobileIconButton({
  label,
  onClick,
  children,
  badge,
  heroMode,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  badge?: number;
  heroMode: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`portal-mobile-icon-btn relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
        heroMode
          ? 'text-white/90 hover:bg-white/15 hover:text-white'
          : 'text-white/75 hover:bg-white/10 hover:text-white'
      }`}
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

export function PortalMobileCommandBar({
  hasMarquee,
  heroMode,
  isSignedIn,
  userName,
  unreadCount,
}: PortalMobileCommandBarProps): ReactNode {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const barTop = hasMarquee ? 'top-10' : 'top-0';

  return (
    <>
      <header
        className={`portal-mobile-command-bar fixed inset-x-0 z-[70] transition-all duration-300 lg:hidden ${barTop} ${
          heroMode ? 'portal-mobile-command-bar--hero' : ''
        }`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-3 sm:px-4">
          <a href="/" className="mr-1 shrink-0" aria-label="Home">
            <SiteLogo height={32} withBackdrop={heroMode} />
          </a>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5">
            <MobileIconButton label="Search" heroMode={heroMode} onClick={() => setSearchOpen(true)}>
              <Search size={18} />
            </MobileIconButton>
            {isSignedIn && (
              <MobileIconButton
                label="Notifications"
                heroMode={heroMode}
                badge={unreadCount}
                onClick={() => router.push('/notifications')}
              >
                <Bell size={18} />
              </MobileIconButton>
            )}
            {isSignedIn ? (
              <div className="relative">
                <MobileIconButton
                  label="Account menu"
                  heroMode={heroMode}
                  onClick={() => setProfileOpen((v) => !v)}
                >
                  <User size={18} />
                </MobileIconButton>
                {profileOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Close account menu"
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
                          router.push('/dashboard');
                          setProfileOpen(false);
                        }}
                        className="block w-full px-4 py-3 text-left text-sm font-medium text-white/90 hover:bg-white/10"
                      >
                        Dashboard
                      </button>
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
                    </div>
                  </>
                )}
              </div>
            ) : (
              <MobileIconButton
                label="Sign in"
                heroMode={heroMode}
                onClick={() => router.push('/login')}
              >
                <LogIn size={18} />
              </MobileIconButton>
            )}
          </div>

          <MobileIconButton label="Open menu" heroMode={heroMode} onClick={() => setDrawerOpen(true)}>
            <Menu size={20} />
          </MobileIconButton>
        </div>
      </header>

      <PortalMobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isSignedIn={isSignedIn}
      />
      <PortalGlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
