'use client';

import { AnimatePresence, MotionConfig, motion, type Variants } from 'framer-motion';
import {
  ArrowRight,
  Ban,
  Bell,
  Calendar,
  ChevronDown,
  Globe,
  HelpCircle,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Package,
  Receipt,
  Ruler,
  Search,
  Ship,
  User,
  UserPlus,
  X,
  DollarSign,
  Plane,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { useUnreadCount } from '@/lib/queries';
import { connectSocket, disconnectSocket } from '@/lib/realtime';
import { useCustomerSession } from '@/lib/use-customer-session';
import { useTenantConfig } from '@/lib/use-tenant-config';

const itemV: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

export function PortalNav({ hasMarquee = true }: { hasMarquee?: boolean }): ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const config = useTenantConfig();
  const { user } = useCustomerSession();
  const { data: session } = authClient.useSession();
  const { data: unreadData } = useUnreadCount();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileSupportOpen, setMobileSupportOpen] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);
  const supportRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  // Live notification updates for signed-in customers
  useEffect(() => {
    if (!session) return;
    if (user?.tenantId) connectSocket(user.tenantId);
    return () => disconnectSocket();
  }, [session, user]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) {
      setMobileServicesOpen(false);
      setMobileSupportOpen(false);
    }
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const closeBtn = menuRef.current?.querySelector<HTMLButtonElement>('[data-close-menu]');
    closeBtn?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
      if (e.key === 'Tab' && menuRef.current) {
        const focusables = Array.from(
          menuRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && (active === first || !menuRef.current.contains(active))) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setServicesOpen(false);
        setSupportOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (servicesRef.current && !servicesRef.current.contains(e.target as Node))
        setServicesOpen(false);
      if (supportRef.current && !supportRef.current.contains(e.target as Node))
        setSupportOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password';
  const isDashboardPage =
    !isAuthPage &&
    !!session &&
    (pathname.startsWith('/dashboard') ||
      pathname.startsWith('/my-') ||
      pathname.startsWith('/invoices') ||
      pathname === '/notifications' ||
      pathname === '/profile' ||
      pathname === '/onboarding');
  const lightNav = isAuthPage || isDashboardPage;
  const isLight = lightNav || (!lightNav && scrolled);
  const tc = isLight
    ? {
        link: 'text-brand-navy/80 hover:text-brand-navy',
        muted: 'text-brand-navy/80 hover:text-brand-navy',
        logo: 'text-brand-navy',
        btn: 'text-brand-navy/80 hover:text-brand-navy',
      }
    : {
        link: 'text-white/90 hover:text-white',
        muted: 'text-white/80 hover:text-white',
        logo: 'text-white',
        btn: 'text-white/80 hover:text-white',
      };

  const navBg = lightNav
    ? 'bg-white border-border'
    : !scrolled
      ? 'bg-transparent border-transparent'
      : 'bg-white/95 backdrop-blur-md border-border shadow-sm';

  const badge = unreadData?.count ?? 0;

  const isActive = (href: string) => {
    const path = href.startsWith('/#') ? href.slice(0, href.indexOf('#')) || '/' : href;
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };
  const servicesActive = isActive('/air-freight') || isActive('/ocean-freight');
  const supportActive = [
    '/faq',
    '/prohibited',
    '/pickup',
    '/volumetric-calculator',
    '/currency-converter',
    '/check-price',
  ].some(isActive);

  const navLinkCls = (href: string) =>
    `text-base font-semibold transition-colors ${isActive(href) ? `text-brand-accent` : tc.link}`;

  const navRowCls = (href: string) =>
    `group flex min-h-[52px] items-center justify-between border-b border-white/10 py-3 text-xl font-semibold transition-colors sm:py-4 sm:text-2xl ${isActive(href) ? `text-brand-accent` : 'text-white/90 hover:text-white'}`;

  return (
    <header
      className={`fixed left-0 w-full z-50 transition-all duration-300 ${hasMarquee ? 'top-10' : 'top-0'} ${navBg}`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
        <a href="/" className="flex items-center gap-2 ml-2">
          <span className={`text-lg sm:text-xl font-bold tracking-tight ${tc.logo}`}>
            {config.shortName}
          </span>
        </a>

        <div className="hidden lg:flex items-center gap-6">
          <a href="/" aria-current={isActive('/') ? 'page' : undefined} className={navLinkCls('/')}>
            Home
          </a>
          <a
            href="/about"
            aria-current={isActive('/about') ? 'page' : undefined}
            className={navLinkCls('/about')}
          >
            About
          </a>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: hover dropdown needs mouse handlers on the wrapper */}
          <div
            ref={servicesRef}
            className="relative"
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
            onFocus={() => setServicesOpen(true)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setServicesOpen(false);
            }}
          >
            <button
              type="button"
              aria-expanded={servicesOpen}
              className={`flex items-center gap-1 text-base font-semibold transition-colors cursor-pointer ${servicesActive ? `text-brand-accent` : tc.link}`}
            >
              Services{' '}
              <ChevronDown
                size={14}
                className={`transition-transform ${servicesOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {servicesOpen && (
              <div className="absolute top-full left-0 pt-2 w-48">
                <div className={`rounded-sm ${isLight ? 'bg-white border-border shadow-lg' : 'bg-brand-navy border border-white/10'} overflow-hidden`}>
                  <a
                    href="/air-freight"
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${isLight ? 'text-foreground/80 hover:text-foreground hover:bg-foreground/5' : 'text-white/80 hover:text-white hover:bg-white/10'} transition-colors`}
                  >
                    <Plane size={16} className={`text-brand-accent`} /> Air Freight
                  </a>
                  <a
                    href="/ocean-freight"
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${isLight ? 'text-foreground/80 hover:text-foreground hover:bg-foreground/5' : 'text-white/80 hover:text-white hover:bg-white/10'} transition-colors`}
                  >
                    <Ship size={16} className={`text-brand-accent`} /> Ocean Freight
                  </a>
                </div>
              </div>
            )}
          </div>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: hover dropdown needs mouse handlers on the wrapper */}
          <div
            ref={supportRef}
            className="relative"
            onMouseEnter={() => setSupportOpen(true)}
            onMouseLeave={() => setSupportOpen(false)}
            onFocus={() => setSupportOpen(true)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setSupportOpen(false);
            }}
          >
            <button
              type="button"
              aria-expanded={supportOpen}
              className={`flex items-center gap-1 text-base font-semibold transition-colors cursor-pointer ${supportActive ? `text-brand-accent` : tc.link}`}
            >
              Support{' '}
              <ChevronDown
                size={14}
                className={`transition-transform ${supportOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {supportOpen && (
              <div className="absolute top-full left-0 pt-2 w-56">
                <div className={`rounded-sm ${isLight ? 'bg-white border-border shadow-lg' : 'bg-brand-navy border border-white/10'} overflow-hidden`}>
                  <a
                    href="/faq"
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${isLight ? 'text-foreground/80 hover:text-foreground hover:bg-foreground/5' : 'text-white/80 hover:text-white hover:bg-white/10'} transition-colors`}
                  >
                    <HelpCircle size={16} className={`text-brand-accent`} /> FAQ
                  </a>
                  <a
                    href="/prohibited"
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${isLight ? 'text-foreground/80 hover:text-foreground hover:bg-foreground/5' : 'text-white/80 hover:text-white hover:bg-white/10'} transition-colors`}
                  >
                    <Ban size={16} className={`text-brand-accent`} /> Prohibited Items
                  </a>
                  <a
                    href="/pickup"
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${isLight ? 'text-foreground/80 hover:text-foreground hover:bg-foreground/5' : 'text-white/80 hover:text-white hover:bg-white/10'} transition-colors`}
                  >
                    <Calendar size={16} className={`text-brand-accent`} /> Pickup
                  </a>
                  <a
                    href="/volumetric-calculator"
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${isLight ? 'text-foreground/80 hover:text-foreground hover:bg-foreground/5' : 'text-white/80 hover:text-white hover:bg-white/10'} transition-colors`}
                  >
                    <Ruler size={16} className={`text-brand-accent`} /> Volumetric Calculator
                  </a>
                  <a
                    href="/currency-converter"
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${isLight ? 'text-foreground/80 hover:text-foreground hover:bg-foreground/5' : 'text-white/80 hover:text-white hover:bg-white/10'} transition-colors`}
                  >
                    <Globe size={16} className={`text-brand-accent`} /> Currency Converter
                  </a>
                  <a
                    href="/check-price"
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${isLight ? 'text-foreground/80 hover:text-foreground hover:bg-foreground/5' : 'text-white/80 hover:text-white hover:bg-white/10'} transition-colors`}
                  >
                    <DollarSign size={16} className={`text-brand-accent`} /> Check Price
                  </a>
                </div>
              </div>
            )}
          </div>
          <a
            href="/branches"
            aria-current={isActive('/branches') ? 'page' : undefined}
            className={navLinkCls('/branches')}
          >
            Branches
          </a>
          <a
            href="/track"
            aria-current={isActive('/track') ? 'page' : undefined}
            className={navLinkCls('/track')}
          >
            Track
          </a>
          <a
            href="/contact"
            aria-current={isActive('/contact') ? 'page' : undefined}
            className={navLinkCls('/contact')}
          >
            Contact
          </a>
        </div>

        <nav className="hidden lg:flex items-center gap-1 sm:gap-2">
          {session ? (
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                onFocus={() => setUserMenuOpen(true)}
                aria-expanded={userMenuOpen}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${lightNav || scrolled ? 'bg-foreground/5 hover:bg-foreground/10 text-foreground/70 hover:text-foreground' : 'bg-white/10 hover:bg-white/20 text-white/90 hover:text-white'}`}
              >
                <User size={16} />
                <span className="text-sm font-medium max-w-[100px] truncate hidden sm:inline">
                  {user?.name}
                </span>
                <ChevronDown
                  size={12}
                  className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                />
                {badge > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-accent px-1 text-[9px] font-bold text-white leading-none">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </button>
              {userMenuOpen && (
                <div className="absolute top-full right-0 pt-2 w-56">
                  <div className={`rounded-sm ${lightNav || scrolled ? 'bg-white border-border shadow-lg' : 'bg-brand-navy border border-white/10'} overflow-hidden`}>
                    <div className={`px-4 py-3 border-b ${lightNav || scrolled ? 'border-border' : 'border-white/10'}`}>
                      <div className={`text-sm font-medium ${lightNav || scrolled ? 'text-foreground' : 'text-white'}`}>{user?.name}</div>
                      <div className={`text-xs ${lightNav || scrolled ? 'text-foreground/60' : 'text-white/60'}`}>{user?.email}</div>
                    </div>
                    <a
                      href="/dashboard"
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${isLight ? 'text-foreground/80 hover:text-foreground hover:bg-foreground/5' : 'text-white/80 hover:text-white hover:bg-white/10'} transition-colors`}
                    >
                      <LayoutDashboard size={16} className={`text-brand-accent`} /> Dashboard
                    </a>
                    <a
                      href="/my-shipments"
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${isLight ? 'text-foreground/80 hover:text-foreground hover:bg-foreground/5' : 'text-white/80 hover:text-white hover:bg-white/10'} transition-colors`}
                    >
                      <Package size={16} className={`text-brand-accent`} /> My Shipments
                    </a>
                    <a
                      href="/my-invoices"
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${isLight ? 'text-foreground/80 hover:text-foreground hover:bg-foreground/5' : 'text-white/80 hover:text-white hover:bg-white/10'} transition-colors`}
                    >
                      <Receipt size={16} className={`text-brand-accent`} /> Invoices
                    </a>
                    <a
                      href="/track"
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${isLight ? 'text-foreground/80 hover:text-foreground hover:bg-foreground/5' : 'text-white/80 hover:text-white hover:bg-white/10'} transition-colors`}
                    >
                      <Search size={16} className={`text-brand-accent`} /> Track
                    </a>
                    <a
                      href="/pickup"
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${isLight ? 'text-foreground/80 hover:text-foreground hover:bg-foreground/5' : 'text-white/80 hover:text-white hover:bg-white/10'} transition-colors`}
                    >
                      <Calendar size={16} className={`text-brand-accent`} /> Schedule Pickup
                    </a>
                    <a
                      href="/notifications"
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${isLight ? 'text-foreground/80 hover:text-foreground hover:bg-foreground/5' : 'text-white/80 hover:text-white hover:bg-white/10'} transition-colors`}
                    >
                      <Bell size={16} className={`text-brand-accent`} /> Notifications
                      {badge > 0 && (
                        <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-accent px-1 text-[9px] font-bold text-white leading-none">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      )}
                    </a>
                    <a
                      href="/profile"
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${isLight ? 'text-foreground/80 hover:text-foreground hover:bg-foreground/5' : 'text-white/80 hover:text-white hover:bg-white/10'} transition-colors`}
                    >
                      <User size={16} className={`text-brand-accent`} /> Profile
                    </a>
                    <div className={`border-t ${isLight ? 'border-border' : 'border-white/10'}`} />
                    <button
                      type="button"
                      onClick={async () => {
                        await authClient.signOut();
                        router.push('/');
                      }}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${isLight ? 'text-foreground/60 hover:text-foreground hover:bg-foreground/5' : 'text-white/60 hover:text-white hover:bg-white/10'} transition-colors w-full text-left`}
                    >
                      <LogOut size={16} /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <a
                href="/login"
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold ${tc.link} transition-colors rounded-full`}
              >
                <LogIn size={15} />
                <span className="hidden sm:inline">Sign in</span>
              </a>
              <a
                href="/register"
                className={`inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white rounded-full bg-brand-accent hover:bg-brand-accent-hover transition-all active:scale-[0.98]`}
              >
                <UserPlus size={15} />
                <span className="hidden sm:inline">Register</span>
              </a>
            </>
          )}
        </nav>

        <button
          ref={hamburgerRef}
          type="button"
          onClick={() => {
            const next = !mobileOpen;
            setMobileOpen(next);
            if (!next) hamburgerRef.current?.focus();
          }}
          className={`lg:hidden flex h-11 w-11 items-center justify-center rounded-lg ${tc.logo} hover:bg-foreground/5 transition-colors active:scale-90`}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {mobileOpen && (
        <AnimatePresence mode="wait">
          <MotionConfig reducedMotion="user">
            <motion.div
              key="mobile-menu"
              ref={menuRef}
              className={`lg:hidden fixed inset-0 z-[70] flex flex-col bg-brand-navy`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
                <a href="/" className="flex items-center gap-2 ml-2">
                  <span className="text-lg sm:text-xl font-bold tracking-tight text-white">
                    {config.shortName}
                  </span>
                </a>
                <button
                  type="button"
                  data-close-menu
                  onClick={() => setMobileOpen(false)}
                  className="p-2 rounded-sm text-white hover:bg-white/10 transition-colors active:scale-90"
                  aria-label="Close menu"
                >
                  <X size={24} />
                </button>
              </div>

              <motion.nav
                initial="hidden"
                animate="show"
                exit="hidden"
                variants={{ show: { transition: { staggerChildren: 0.05 } }, hidden: {} }}
                className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4 sm:px-6 sm:pb-6"
              >
                <div className="mx-auto flex max-w-md flex-col">
                  <motion.a
                    href="/"
                    onClick={() => setMobileOpen(false)}
                    aria-current={isActive('/') ? 'page' : undefined}
                    variants={itemV}
                    className={navRowCls('/')}
                  >
                    Home
                    <ArrowRight
                      size={20}
                      className={`-translate-x-2 text-brand-accent opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100`}
                    />
                  </motion.a>
                  <motion.a
                    href="/about"
                    onClick={() => setMobileOpen(false)}
                    aria-current={isActive('/about') ? 'page' : undefined}
                    variants={itemV}
                    className={navRowCls('/about')}
                  >
                    About
                    <ArrowRight
                      size={20}
                      className={`-translate-x-2 text-brand-accent opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100`}
                    />
                  </motion.a>
                  <motion.div variants={itemV} className="border-b border-white/10">
                    <button
                      type="button"
                      onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                      aria-expanded={mobileServicesOpen}
                      className={`flex w-full min-h-[52px] items-center justify-between py-3 text-left text-xl font-semibold transition-colors sm:py-4 sm:text-2xl ${servicesActive ? `text-brand-accent` : 'text-white/90 hover:text-white'}`}
                    >
                      Services
                      <ChevronDown
                        size={22}
                        className={`text-brand-accent transition-transform duration-300 ${mobileServicesOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {mobileServicesOpen && (
                        <motion.div
                          key="services-items"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-col gap-1.5 pb-4">
                            <a
                              href="/air-freight"
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center gap-3 rounded-sm bg-white/5 px-4 py-3 text-base font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <Plane size={18} className={`text-brand-accent`} /> Air Freight
                            </a>
                            <a
                              href="/ocean-freight"
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center gap-3 rounded-sm bg-white/5 px-4 py-3 text-base font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <Ship size={18} className={`text-brand-accent`} /> Ocean Freight
                            </a>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <motion.div variants={itemV} className="border-b border-white/10">
                    <button
                      type="button"
                      onClick={() => setMobileSupportOpen(!mobileSupportOpen)}
                      aria-expanded={mobileSupportOpen}
                      className={`flex w-full min-h-[52px] items-center justify-between py-3 text-left text-xl font-semibold transition-colors sm:py-4 sm:text-2xl ${supportActive ? `text-brand-accent` : 'text-white/90 hover:text-white'}`}
                    >
                      Support
                      <ChevronDown
                        size={22}
                        className={`text-brand-accent transition-transform duration-300 ${mobileSupportOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {mobileSupportOpen && (
                        <motion.div
                          key="support-items"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-col gap-1.5 pb-4">
                            <a
                              href="/faq"
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center gap-3 rounded-sm bg-white/5 px-4 py-3 text-base font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <HelpCircle size={18} className={`text-brand-accent`} /> FAQ
                            </a>
                            <a
                              href="/prohibited"
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center gap-3 rounded-sm bg-white/5 px-4 py-3 text-base font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <Ban size={18} className={`text-brand-accent`} /> Prohibited Items
                            </a>
                            <a
                              href="/pickup"
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center gap-3 rounded-sm bg-white/5 px-4 py-3 text-base font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <Calendar size={18} className={`text-brand-accent`} /> Pickup
                            </a>
                            <a
                              href="/volumetric-calculator"
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center gap-3 rounded-sm bg-white/5 px-4 py-3 text-base font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <Ruler size={18} className={`text-brand-accent`} /> Volumetric Calculator
                            </a>
                            <a
                              href="/currency-converter"
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center gap-3 rounded-sm bg-white/5 px-4 py-3 text-base font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <Globe size={18} className={`text-brand-accent`} /> Currency Converter
                            </a>
                            <a
                              href="/check-price"
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center gap-3 rounded-sm bg-white/5 px-4 py-3 text-base font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <DollarSign size={18} className={`text-brand-accent`} /> Check Price
                            </a>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <motion.a
                    href="/branches"
                    onClick={() => setMobileOpen(false)}
                    aria-current={isActive('/branches') ? 'page' : undefined}
                    variants={itemV}
                    className={navRowCls('/branches')}
                  >
                    Branches
                    <ArrowRight
                      size={20}
                      className={`-translate-x-2 text-brand-accent opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100`}
                    />
                  </motion.a>
                  <motion.a
                    href="/track"
                    onClick={() => setMobileOpen(false)}
                    aria-current={isActive('/track') ? 'page' : undefined}
                    variants={itemV}
                    className={navRowCls('/track')}
                  >
                    Track
                    <ArrowRight
                      size={20}
                      className={`-translate-x-2 text-brand-accent opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100`}
                    />
                  </motion.a>
                  <motion.a
                    href="/contact"
                    onClick={() => setMobileOpen(false)}
                    aria-current={isActive('/contact') ? 'page' : undefined}
                    variants={itemV}
                    className={navRowCls('/contact')}
                  >
                    Contact
                    <ArrowRight
                      size={20}
                      className={`-translate-x-2 text-brand-accent opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100`}
                    />
                  </motion.a>
                </div>
              </motion.nav>

              <div className={`shrink-0 border-t border-white/10 bg-brand-navy px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-5`}>
                <div className="mx-auto flex max-w-md flex-col gap-2">
                  {session ? (
                    <>
                      <a
                        href="/dashboard"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-between rounded-sm bg-white/5 px-4 py-3.5 text-base font-semibold text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        Dashboard <ArrowRight size={18} className={`text-brand-accent`} />
                      </a>
                      <a
                        href="/my-shipments"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-between rounded-sm bg-white/5 px-4 py-3.5 text-base font-semibold text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        My Shipments <ArrowRight size={18} className={`text-brand-accent`} />
                      </a>
                      <a
                        href="/my-invoices"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-between rounded-sm bg-white/5 px-4 py-3.5 text-base font-semibold text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        Invoices <ArrowRight size={18} className={`text-brand-accent`} />
                      </a>
                      <a
                        href="/track"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-between rounded-sm bg-white/5 px-4 py-3.5 text-base font-semibold text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        Track <ArrowRight size={18} className={`text-brand-accent`} />
                      </a>
                      <a
                        href="/profile"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-between rounded-sm bg-white/5 px-4 py-3.5 text-base font-semibold text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        Profile <ArrowRight size={18} className={`text-brand-accent`} />
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          authClient.signOut();
                          router.push('/');
                        }}
                        className="mt-1 flex items-center justify-center gap-2 rounded-sm border border-white/20 px-4 py-3.5 text-base font-semibold text-white/80 hover:border-white/40 hover:text-white transition-colors"
                      >
                        <LogOut size={18} /> Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <a
                        href="/login"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-center gap-2 rounded-sm border border-white/20 px-4 py-3.5 text-base font-semibold text-white/90 hover:border-white/40 hover:text-white transition-colors active:scale-[0.98]"
                      >
                        <LogIn size={18} /> Sign in
                      </a>
                      <a
                        href="/register"
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center justify-center gap-2 rounded-sm bg-brand-accent px-4 py-3.5 text-base font-semibold text-white hover:bg-brand-accent-hover transition-colors active:scale-[0.98]`}
                      >
                        <UserPlus size={18} /> Register
                      </a>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </MotionConfig>
        </AnimatePresence>
      )}
    </header>
  );
}
