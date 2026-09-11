'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { LeftSidebar } from '@/components/sidebar';
import { authClient } from '@/lib/auth-client';
import { useTenantConfig } from '@/lib/use-tenant-config';

type PortalOpsMobileDrawerProps = {
  open: boolean;
  onClose: () => void;
  userName?: string | null;
};

export function PortalOpsMobileDrawer({
  open,
  onClose,
  userName,
}: PortalOpsMobileDrawerProps): ReactNode {
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
            className="fixed inset-0 z-[70] bg-brand-navy/55 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="portal-ops-drawer fixed inset-y-0 left-0 z-[75] flex w-[min(88vw,320px)] flex-col border-r border-white/10 bg-brand-navy-deep lg:hidden"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          >
            <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{config.shortName}</p>
                <p className="truncate text-[11px] text-white/50">{userName ?? 'Customer portal'}</p>
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
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <LeftSidebar variant="dashboard" drawer opsDrawer />
            </div>
            <div className="border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={async () => {
                  await authClient.signOut();
                  router.push('/');
                  onClose();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/5 hover:text-white"
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
