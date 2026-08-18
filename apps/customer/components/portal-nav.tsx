'use client';

import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
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
  Plane,
  Receipt,
  Ruler,
  Search,
  Ship,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { useUnreadCount } from '@/lib/queries';
import { connectSocket, disconnectSocket } from '@/lib/realtime';
import { useTenantConfig } from '@/lib/use-tenant-config';

const itemV = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

export function PortalNav(): ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const config = useTenantConfig();
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

  // Live notification updates for signed-in customers
  useEffect(() => {
    if (!session) return;
    const tenantId = (session.user as Record<string, unknown>).tenantId as string | undefined;
    if (tenantId) connectSocket(tenantId);
    return () => disconnectSocket();
  }, [session]);

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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

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
  const tc = lightNav
    ? {
        link: 'text-[#111111]/80 hover:text-[#111111]',
        muted: 'text-[#111111]/80 hover:text-[#111111]',
        logo: 'text-[#111111]',
        btn: 'text-[#111111]/80 hover:text-[#111111]',
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
      : 'bg-[#111111]/95 backdrop-blur-md border-white/10';

  const badge = unreadData?.count ?? 0;

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 border-b ${navBg}`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
        <a href="/" className="flex items-center gap-2">
          <span
            className={`text-lg sm:text-xl font-bold tracking-tight ${lightNav ? 'text-[#111111]' : 'text-white'}`}
          >
            {config.shortName}
          </span>
        </a>

        <div className="hidden lg:flex items-center gap-6">
          <a href="/" className={`text-base font-semibold ${tc.link} transition-colors`}>
            Home
          </a>
          <a href="/about" className={`text-base font-semibold ${tc.link} transition-colors`}>
            About
          </a>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: hover dropdown needs mouse handlers on the wrapper */}
          <div
            ref={servicesRef}
            className="relative"
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
          >
            <button
              type="button"
              className={`flex items-center gap-1 text-base font-semibold ${tc.link} transition-colors cursor-pointer`}
            >
              Services{' '}
              <ChevronDown
                size={14}
                className={`transition-transform ${servicesOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {servicesOpen && (
              <div className="absolute top-full left-0 pt-2 w-48">
                <div className="rounded-xl bg-[#111111] border border-white/10 shadow-xl overflow-hidden">
                  <a
                    href="/air-freight"
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Plane size={16} className="text-[#F94735]" /> Air Freight
                  </a>
                  <a
                    href="/ocean-freight"
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Ship size={16} className="text-[#F94735]" /> Ocean Freight
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
          >
            <button
              type="button"
              className={`flex items-center gap-1 text-base font-semibold ${tc.link} transition-colors cursor-pointer`}
            >
              Support{' '}
              <ChevronDown
                size={14}
                className={`transition-transform ${supportOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {supportOpen && (
              <div className="absolute top-full left-0 pt-2 w-56">
                <div className="rounded-xl bg-[#111111] border border-white/10 shadow-xl overflow-hidden">
                  <a
                    href="/faq"
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <HelpCircle size={16} className="text-[#F94735]" /> FAQ
                  </a>
                  <a
                    href="/prohibited"
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Ban size={16} className="text-[#F94735]" /> Prohibited Items
                  </a>
                  <a
                    href="/pickup"
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Calendar size={16} className="text-[#F94735]" /> Pickup
                  </a>
                  <a
                    href="/volumetric-calculator"
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Ruler size={16} className="text-[#F94735]" /> Volumetric Calculator
                  </a>
                  <a
                    href="/currency-converter"
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Globe size={16} className="text-[#F94735]" /> Currency Converter
                  </a>
                </div>
              </div>
            )}
          </div>
          <a href="/branches" className={`text-base font-semibold ${tc.link} transition-colors`}>
            Branches
          </a>
          <a href="/#track" className={`text-base font-semibold ${tc.link} transition-colors`}>
            Track
          </a>
          <a href="/contact" className={`text-base font-semibold ${tc.link} transition-colors`}>
            Contact
          </a>
        </div>

        <nav className="hidden lg:flex items-center gap-1 sm:gap-2">
          {session ? (
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${lightNav ? 'bg-foreground/5 hover:bg-foreground/10 text-foreground/70 hover:text-foreground' : 'bg-white/10 hover:bg-white/20 text-white/90 hover:text-white'}`}
              >
                <User size={16} />
                <span className="text-sm font-medium max-w-[100px] truncate hidden sm:inline">
                  {(session.user as Record<string, unknown>).name as string}
                </span>
                <ChevronDown
                  size={12}
                  className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                />
                {badge > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#F94735] px-1 text-[9px] font-bold text-white leading-none">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </button>
              {userMenuOpen && (
                <div className="absolute top-full right-0 pt-2 w-56">
                  <div className="rounded-xl bg-[#111111] border border-white/10 shadow-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/10">
                      <div className="text-sm font-medium text-white">
                        {(session.user as Record<string, unknown>).name as string}
                      </div>
                      <div className="text-xs text-white/60">
                        {(session.user as Record<string, unknown>).email as string}
                      </div>
                    </div>
                    <a
                      href="/dashboard"
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <LayoutDashboard size={16} className="text-[#F94735]" /> Dashboard
                    </a>
                    <a
                      href="/my-shipments"
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Package size={16} className="text-[#F94735]" /> My Shipments
                    </a>
                    <a
                      href="/my-invoices"
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Receipt size={16} className="text-[#F94735]" /> Invoices
                    </a>
                    <a
                      href="/track"
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Search size={16} className="text-[#F94735]" /> Track
                    </a>
                    <a
                      href="/pickup"
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Calendar size={16} className="text-[#F94735]" /> Schedule Pickup
                    </a>
                    <a
                      href="/notifications"
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <Bell size={16} className="text-[#F94735]" /> Notifications
                      {badge > 0 && (
                        <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#F94735] px-1 text-[9px] font-bold text-white leading-none">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      )}
                    </a>
                    <a
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <User size={16} className="text-[#F94735]" /> Profile
                    </a>
                    <div className="border-t border-white/10" />
                    <button
                      type="button"
                      onClick={async () => {
                        await authClient.signOut();
                        router.push('/');
                      }}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors w-full text-left"
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
                className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white rounded-full bg-[#F94735] hover:bg-[#D83220] transition-all"
              >
                <UserPlus size={15} />
                <span className="hidden sm:inline">Register</span>
              </a>
            </>
          )}
        </nav>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className={`lg:hidden p-2 rounded-lg ${tc.logo} hover:bg-foreground/5 transition-colors`}
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
              className="lg:hidden fixed inset-0 z-[60] flex flex-col bg-[#111111]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 lg:px-8">
                <a href="/" className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl font-bold tracking-tight text-white">
                    {config.shortName}
                  </span>
                </a>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-2 rounded-sm text-white hover:bg-white/10 transition-colors"
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
                className="flex-1 overflow-y-auto px-6 pb-6"
              >
                <div className="mx-auto flex max-w-md flex-col">
                  <motion.a
                    href="/"
                    onClick={() => setMobileOpen(false)}
                    variants={itemV}
                    className="group flex items-center justify-between border-b border-white/10 py-4 text-2xl font-semibold text-white/90 hover:text-white transition-colors"
                  >
                    Home
                    <ArrowRight
                      size={20}
                      className="-translate-x-2 text-[#F94735] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                    />
                  </motion.a>
                  <motion.a
                    href="/about"
                    onClick={() => setMobileOpen(false)}
                    variants={itemV}
                    className="group flex items-center justify-between border-b border-white/10 py-4 text-2xl font-semibold text-white/90 hover:text-white transition-colors"
                  >
                    About
                    <ArrowRight
                      size={20}
                      className="-translate-x-2 text-[#F94735] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                    />
                  </motion.a>
                  <motion.div variants={itemV} className="border-b border-white/10">
                    <button
                      type="button"
                      onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                      aria-expanded={mobileServicesOpen}
                      className="flex w-full items-center justify-between py-4 text-left text-2xl font-semibold text-white/90 hover:text-white transition-colors"
                    >
                      Services
                      <ChevronDown
                        size={22}
                        className={`text-[#F94735] transition-transform duration-300 ${mobileServicesOpen ? 'rotate-180' : ''}`}
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
                              <Plane size={18} className="text-[#F94735]" /> Air Freight
                            </a>
                            <a
                              href="/ocean-freight"
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center gap-3 rounded-sm bg-white/5 px-4 py-3 text-base font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <Ship size={18} className="text-[#F94735]" /> Ocean Freight
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
                      className="flex w-full items-center justify-between py-4 text-left text-2xl font-semibold text-white/90 hover:text-white transition-colors"
                    >
                      Support
                      <ChevronDown
                        size={22}
                        className={`text-[#F94735] transition-transform duration-300 ${mobileSupportOpen ? 'rotate-180' : ''}`}
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
                              <HelpCircle size={18} className="text-[#F94735]" /> FAQ
                            </a>
                            <a
                              href="/prohibited"
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center gap-3 rounded-sm bg-white/5 px-4 py-3 text-base font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <Ban size={18} className="text-[#F94735]" /> Prohibited Items
                            </a>
                            <a
                              href="/pickup"
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center gap-3 rounded-sm bg-white/5 px-4 py-3 text-base font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <Calendar size={18} className="text-[#F94735]" /> Pickup
                            </a>
                            <a
                              href="/volumetric-calculator"
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center gap-3 rounded-sm bg-white/5 px-4 py-3 text-base font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <Ruler size={18} className="text-[#F94735]" /> Volumetric Calculator
                            </a>
                            <a
                              href="/currency-converter"
                              onClick={() => setMobileOpen(false)}
                              className="flex items-center gap-3 rounded-sm bg-white/5 px-4 py-3 text-base font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              <Globe size={18} className="text-[#F94735]" /> Currency Converter
                            </a>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <motion.a
                    href="/branches"
                    onClick={() => setMobileOpen(false)}
                    variants={itemV}
                    className="group flex items-center justify-between border-b border-white/10 py-4 text-2xl font-semibold text-white/90 hover:text-white transition-colors"
                  >
                    Branches
                    <ArrowRight
                      size={20}
                      className="-translate-x-2 text-[#F94735] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                    />
                  </motion.a>
                  {/* biome-ignore lint/a11y/useValidAnchor: real navigation link to the track section on the home page */}
                  <motion.a
                    href="/#track"
                    onClick={() => setMobileOpen(false)}
                    variants={itemV}
                    className="group flex items-center justify-between border-b border-white/10 py-4 text-2xl font-semibold text-white/90 hover:text-white transition-colors"
                  >
                    Track
                    <ArrowRight
                      size={20}
                      className="-translate-x-2 text-[#F94735] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                    />
                  </motion.a>
                  <motion.a
                    href="/contact"
                    onClick={() => setMobileOpen(false)}
                    variants={itemV}
                    className="group flex items-center justify-between border-b border-white/10 py-4 text-2xl font-semibold text-white/90 hover:text-white transition-colors"
                  >
                    Contact
                    <ArrowRight
                      size={20}
                      className="-translate-x-2 text-[#F94735] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                    />
                  </motion.a>
                </div>
              </motion.nav>

              <div className="shrink-0 border-t border-white/10 bg-[#111111] px-6 py-5">
                <div className="mx-auto flex max-w-md flex-col gap-2">
                  {session ? (
                    <>
                      <a
                        href="/dashboard"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-between rounded-sm bg-white/5 px-4 py-3.5 text-base font-semibold text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        Dashboard <ArrowRight size={18} className="text-[#F94735]" />
                      </a>
                      <a
                        href="/my-shipments"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-between rounded-sm bg-white/5 px-4 py-3.5 text-base font-semibold text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        My Shipments <ArrowRight size={18} className="text-[#F94735]" />
                      </a>
                      <a
                        href="/my-invoices"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-between rounded-sm bg-white/5 px-4 py-3.5 text-base font-semibold text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        Invoices <ArrowRight size={18} className="text-[#F94735]" />
                      </a>
                      <a
                        href="/track"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-between rounded-sm bg-white/5 px-4 py-3.5 text-base font-semibold text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        Track <ArrowRight size={18} className="text-[#F94735]" />
                      </a>
                      <a
                        href="/profile"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-between rounded-sm bg-white/5 px-4 py-3.5 text-base font-semibold text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        Profile <ArrowRight size={18} className="text-[#F94735]" />
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
                        className="flex items-center justify-center gap-2 rounded-sm border border-white/20 px-4 py-3.5 text-base font-semibold text-white/90 hover:border-white/40 hover:text-white transition-colors"
                      >
                        <LogIn size={18} /> Sign in
                      </a>
                      <a
                        href="/register"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-center gap-2 rounded-sm bg-[#F94735] px-4 py-3.5 text-base font-semibold text-white hover:bg-[#D83220] transition-colors"
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
