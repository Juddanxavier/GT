'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';

// lucide-react v1 dropped brand icons; inline SVGs keep zero new deps.
function BrandIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      {children}
    </svg>
  );
}
const Facebook = () => <BrandIcon><path d="M13.5 21v-8h2.7l.4-3h-3.1V8c0-.9.2-1.5 1.5-1.5H17V3.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2V10H7.8v3h2.7v8h3z" /></BrandIcon>;
const Twitter = () => <BrandIcon><path d="M22 5.9c-.7.3-1.5.5-2.3.6.8-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1a4.1 4.1 0 0 0-7 3.7A11.6 11.6 0 0 1 3.4 4.6a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.3-.2-1.9-.5a4.1 4.1 0 0 0 3.3 4c-.6.2-1.2.2-1.8.1a4.1 4.1 0 0 0 3.8 2.9A8.2 8.2 0 0 1 2 18.3a11.6 11.6 0 0 0 6.3 1.8c7.5 0 11.7-6.3 11.7-11.7v-.5c.8-.6 1.5-1.3 2-2z" /></BrandIcon>;
const Dribbble = () => <BrandIcon><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.6 4.6a8.5 8.5 0 0 1 1.9 5.3c-.3 0-3.1-.6-5.9-.3l-.4-.9c3-1.2 4.3-3 4.4-4.1zM12 3.5c2 0 3.9.8 5.3 2-.1.9-1.2 2.6-4.1 3.7A38 38 0 0 0 9.5 4 8.5 8.5 0 0 1 12 3.5zM7.9 4.6a44 44 0 0 1 3.7 5.1c-3.4.9-6.4.9-6.7.9a8.5 8.5 0 0 1 3-6zM3.5 12v-.3c.4 0 3.9.1 7.6-1 .2.4.4.9.6 1.3-3.9 1.1-5.9 4.5-6.1 4.8A8.5 8.5 0 0 1 3.5 12zm8.5 8.5c-1.9 0-3.7-.6-5.1-1.7.1-.3 1.6-3.2 5.9-4.6a35 35 0 0 1 1.8 6.4c-.8.3-1.7.5-2.6.5zm4-.2a37 37 0 0 0-1.6-6c2.6-.4 4.9.3 5.2.4a8.5 8.5 0 0 1-3.6 5.6z" /></BrandIcon>;
const Youtube = () => <BrandIcon><path d="M23 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.7-1.7C19.3 5.2 12 5.2 12 5.2s-7.3 0-8.9.4A2.5 2.5 0 0 0 1.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a2.5 2.5 0 0 0 1.7 1.7c1.6.4 8.9.4 8.9.4s7.3 0 8.9-.4a2.5 2.5 0 0 0 1.7-1.7C23 15.2 23 12 23 12zM9.8 15.3V8.7l5.7 3.3-5.7 3.3z" /></BrandIcon>;
const Linkedin = () => <BrandIcon><path d="M6.9 21H3.4V9h3.5v12zM5.1 7.4A2 2 0 1 1 5.2 3.4a2 2 0 0 1 0 4zM21 21h-3.5v-5.8c0-1.4 0-3.2-2-3.2s-2.2 1.5-2.2 3.1V21H9.8V9h3.3v1.6h.1c.5-.9 1.6-1.8 3.3-1.8 3.5 0 4.2 2.3 4.2 5.4V21z" /></BrandIcon>;
const Instagram = () => <BrandIcon><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4a3.8 3.8 0 0 1-1.4-.9 3.8 3.8 0 0 1-.9-1.4c-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.1-1.1.1-1.7.2-2.1.4-.5.2-.9.4-1.3.8-.4.4-.6.8-.8 1.3-.2.4-.3 1-.4 2.1C2.6 9.9 2.6 10.3 2.6 12s0 2.1.1 3.3c.1 1.1.2 1.7.4 2.1.2.5.4.9.8 1.3.4.4.8.6 1.3.8.4.2 1 .3 2.1.4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1.1-.1 1.7-.2 2.1-.4.5-.2.9-.4 1.3-.8.4-.4.6-.8.8-1.3.2-.4.3-1 .4-2.1.1-1.2.1-1.6.1-3.3s0-2.1-.1-3.3c-.1-1.1-.2-1.7-.4-2.1a3.5 3.5 0 0 0-.8-1.3 3.5 3.5 0 0 0-1.3-.8c-.4-.2-1-.3-2.1-.4-1.2-.1-1.6-.1-4.7-.1zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8zm0 8a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2zm6.3-8.3a1.1 1.1 0 1 1-2.3 0 1.1 1.1 0 0 1 2.3 0z" /></BrandIcon>;

const NAV_LINKS = ['Domain', 'Servers', 'Cloud', 'Managed', 'Email', 'Privacy'];

const FOOTER_COLUMNS = [
  { title: 'SERVERS', links: ['Web Servers', 'VPS Servers', 'Cloud Servers', 'Managed Instances', 'Bare Metal'] },
  { title: 'DOMAINS', links: ['Find Domain', 'Move Domains', 'DNS Manager', 'Domain Costs'] },
  { title: 'HELP US', links: ['Open a Ticket', 'FAQs', 'Docs', 'Tutorials', 'Forum'] },
  { title: 'ABOUT', links: ['Our Story', 'Leadership Team', 'Press Room', 'We Hire', 'Alliance', 'Blog'] },
];

const SOCIAL_ICONS = [Facebook, Twitter, Dribbble, Youtube, Linkedin, Instagram];

function Logo() {
  return (
    <svg viewBox="0 0 480 480" className="w-8 h-8" fill="white" aria-hidden="true">
      <path d="M480 240a240 240 0 0 0-240 240 240 240 0 0 0 240-240Z" />
      <path d="M240 0A240 240 0 0 0 0 240 240 240 0 0 0 240 0Z" />
      <path d="M480 240A240 240 0 0 0 240 0a240 240 0 0 0 240 240Z" />
      <path d="M240 480A240 240 0 0 0 0 240a240 240 0 0 0 240 240Z" />
    </svg>
  );
}

export default function NotFound(): ReactNode {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    if (mobileMenuOpen) {
      const id = requestAnimationFrame(() => setMenuVisible(true));
      return () => cancelAnimationFrame(id);
    }
  }, [mobileMenuOpen]);

  function openMenu() {
    setMobileMenuOpen(true);
  }

  function closeMenu() {
    setMenuVisible(false);
    setTimeout(() => setMobileMenuOpen(false), 500);
  }

  function toggleMenu() {
    if (mobileMenuOpen) closeMenu();
    else openMenu();
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-auto bg-black"
      style={{ fontFamily: '"Helvetica Now Var", Helvetica, Arial, sans-serif' }}
    >
      <div className="relative min-h-screen flex flex-col">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260613_180732_a54afbf6-b30d-470e-861f-669871f09f67.mp4"
        />

        <div className="relative z-10 flex flex-col min-h-screen">
          {/* NAV */}
          <nav className="flex items-center justify-between px-6 md:px-12 lg:px-16 py-5">
            <a href="/" className="flex items-center gap-2">
              <Logo />
              <span className="text-white text-xl font-bold tracking-wider">NEXOVA</span>
            </a>

            <div className="hidden lg:flex items-center gap-8">
              {NAV_LINKS.map((link) => (
                <a
                  key={link}
                  href="#"
                  className="text-white/80 hover:text-white tracking-wide transition-colors duration-200"
                >
                  {link}
                </a>
              ))}
            </div>

            <a
              href="/"
              className="hidden lg:inline-flex items-center gap-2 bg-gradient-to-r from-emerald-400 to-cyan-500 text-white font-semibold px-6 py-2.5 rounded-full"
            >
              LOG IN
              <ArrowRight className="w-4 h-4" />
            </a>

            <button
              type="button"
              aria-label="Toggle menu"
              onClick={toggleMenu}
              className="lg:hidden relative z-[60] w-8 h-8 flex items-center justify-center"
            >
              <Menu
                className={`absolute w-6 h-6 text-white transition-all duration-300 ${
                  mobileMenuOpen ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'
                }`}
              />
              <X
                className={`absolute w-6 h-6 text-white transition-all duration-300 ${
                  mobileMenuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'
                }`}
              />
            </button>
          </nav>

          {/* MOBILE MENU */}
          {mobileMenuOpen && (
            <>
              <div
                onClick={closeMenu}
                className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-md transition-opacity duration-[400ms] ${
                  menuVisible ? 'opacity-100' : 'opacity-0'
                }`}
              />
              <div className="absolute left-0 right-0 top-[68px] z-50">
                <div className="absolute inset-0 backdrop-blur-xl rounded-b-2xl" />
                <div className="relative z-10 flex flex-col items-center gap-6 py-10">
                  {NAV_LINKS.map((link, index) => (
                    <a
                      key={link}
                      href="#"
                      onClick={closeMenu}
                      className="text-lg sm:text-xl font-light tracking-[0.08em] text-white/80 hover:text-white transition-all duration-[400ms] ease-out"
                      style={{
                        opacity: menuVisible ? 1 : 0,
                        transform: menuVisible ? 'translateY(0)' : 'translateY(12px)',
                        transitionDelay: `${menuVisible ? 350 + index * 50 : 0}ms`,
                      }}
                    >
                      {link}
                    </a>
                  ))}
                  <a
                    href="/"
                    onClick={closeMenu}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-400 to-cyan-500 text-white font-semibold px-6 py-2.5 rounded-full transition-all duration-[400ms] ease-out"
                    style={{
                      opacity: menuVisible ? 1 : 0,
                      transform: menuVisible ? 'translateY(0)' : 'translateY(12px)',
                      transitionDelay: `${menuVisible ? 350 + NAV_LINKS.length * 50 : 0}ms`,
                    }}
                  >
                    LOG IN
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </>
          )}

          {/* HERO / 404 */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-12 sm:py-16 md:py-0">
            <h1 className="text-white/80 text-lg xs:text-2xl sm:text-3xl md:text-5xl font-light leading-snug tracking-tight mb-1 sm:mb-2">
              This page seems to have
            </h1>
            <h1 className="text-white/80 text-lg xs:text-2xl sm:text-3xl md:text-5xl font-light leading-snug tracking-tight mb-8 sm:mb-12">
              slipped beyond our reach :/
            </h1>

            <div className="relative mb-8 sm:mb-12 w-full flex justify-center overflow-visible">
              <span className="four-oh-four text-[80px] xs:text-[100px] sm:text-[140px] md:text-[200px] lg:text-[260px] font-black text-white leading-none tracking-tighter select-none">
                404
              </span>
            </div>

            <a
              href="/"
              className="liquid-glass text-white text-[10px] xs:text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] font-medium px-6 sm:px-8 py-3 sm:py-3.5 rounded-full uppercase"
            >
              Return to Main Page
            </a>
          </div>

          {/* FOOTER */}
          <footer className="relative z-10 px-4 sm:px-6 md:px-12 lg:px-16 pb-8 sm:pb-10 pt-10 sm:pt-16">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 sm:gap-8 lg:gap-6">
              {FOOTER_COLUMNS.map((col) => (
                <div key={col.title}>
                  <h3 className="text-white text-[10px] sm:text-xs font-bold tracking-[0.15em] mb-3 sm:mb-4">
                    {col.title}
                  </h3>
                  <ul className="space-y-2 sm:space-y-2.5">
                    {col.links.map((link) => (
                      <li key={link}>
                        <a
                          href="#"
                          className="text-white/50 hover:text-white/80 text-[10px] sm:text-xs transition-colors duration-200"
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div className="col-span-2 lg:col-span-2">
                <h3 className="text-white text-[10px] sm:text-xs font-bold tracking-[0.15em] mb-3 sm:mb-4">
                  JOIN FOR EXCLUSIVE DEALS
                </h3>
                <div className="flex max-w-sm">
                  <input
                    type="email"
                    placeholder="Type your email to sign up"
                    className="min-w-0 flex-1 bg-white text-black text-[10px] sm:text-xs px-3 py-2 rounded-l-md outline-none"
                  />
                  <button
                    type="button"
                    className="bg-gradient-to-r from-emerald-400 to-cyan-500 text-white text-[10px] sm:text-xs font-bold tracking-wider px-4 py-2 rounded-r-md"
                  >
                    SEND IT
                  </button>
                </div>

                <h3 className="text-white text-[10px] sm:text-xs font-bold tracking-[0.15em] mt-5 sm:mt-6 mb-3">
                  CONNECT
                </h3>
                <div className="flex gap-3">
                  {SOCIAL_ICONS.map((Icon, i) => (
                    <a key={i} href="#" className="text-white/50 hover:text-white transition-colors duration-200">
                      <Icon />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
