'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { LogIn, LogOut, UserPlus, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { authClient } from '@/lib/auth-client';
import {
  isMobileNavActive,
  MOBILE_ACCOUNT_LINKS,
  MOBILE_NAV_SECTIONS,
} from '@/lib/portal-mobile-nav-config';
import { useTenantConfig } from '@/lib/use-tenant-config';

type PortalMobileDrawerProps = {
  open: boolean;
  onClose: () => void;
  isSignedIn: boolean;
};

export function PortalMobileDrawer({
  open,
  onClose,
  isSignedIn,
}: PortalMobileDrawerProps): ReactNode {
  const pathname = usePathname();
  const router = useRouter();
  const config = useTenantConfig();

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-[75] bg-brand-navy/50 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="portal-mobile-drawer fixed inset-y-0 left-0 z-[80] flex w-[min(92vw,340px)] flex-col lg:hidden"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
          >
            <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{config.shortName}</p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-brand-accent/90">
                  Logistics
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
              {MOBILE_NAV_SECTIONS.map((section) => (
                <div key={section.id}>
                  <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                    {section.title}
                  </p>
                  <div className="space-y-0.5">
                    {section.links.map((link) => {
                      const active = isMobileNavActive(pathname, link.href);
                      const Icon = link.icon;
                      return (
                        <a
                          key={link.href}
                          href={link.href}
                          onClick={onClose}
                          aria-current={active ? 'page' : undefined}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                            active
                              ? 'bg-brand-accent/20 text-white'
                              : 'text-white/75 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <Icon size={16} className="shrink-0 text-brand-accent" />
                          {link.label}
                        </a>
                      );
                    })}
                  </div>
                </div>
              ))}

              {isSignedIn && (
                <div>
                  <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                    Your account
                  </p>
                  <div className="space-y-0.5">
                    {MOBILE_ACCOUNT_LINKS.map((link) => {
                      const active = isMobileNavActive(pathname, link.href);
                      const Icon = link.icon;
                      return (
                        <a
                          key={link.href}
                          href={link.href}
                          onClick={onClose}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                            active
                              ? 'bg-brand-accent/20 text-white'
                              : 'text-white/75 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <Icon size={16} className="shrink-0 text-brand-accent" />
                          {link.label}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </nav>

            <div className="border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {isSignedIn ? (
                <button
                  type="button"
                  onClick={async () => {
                    await authClient.signOut();
                    router.push('/');
                    onClose();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/5"
                >
                  <LogOut size={16} /> Sign out
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href="/login"
                    onClick={onClose}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-white/15 px-3 py-3 text-sm font-semibold text-white/90"
                  >
                    <LogIn size={15} /> Sign in
                  </a>
                  <a
                    href="/register"
                    onClick={onClose}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-accent px-3 py-3 text-sm font-semibold text-white"
                  >
                    <UserPlus size={15} /> Register
                  </a>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
