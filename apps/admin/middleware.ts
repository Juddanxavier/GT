import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/onboard',
  '/unauthorized',
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/icon.svg' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const cookie = request.headers.get('cookie') || '';
  try {
    const res = await fetch(`${API_BASE}/api/auth/get-session`, {
      headers: { cookie },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.session) return NextResponse.next();
    }
  } catch {}

  const login = new URL('/login', request.url);
  login.searchParams.set('next', pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
