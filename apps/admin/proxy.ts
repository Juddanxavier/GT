import { NextResponse, type NextRequest } from 'next/server';

const publicPaths = [
  '/login',
  '/2fa',
  '/forgot-password',
  '/reset-password',
  '/onboard',
  '/unauthorized',
  '/_next/',
  '/api/',
  '/favicon.ico',
  '/icon.svg',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('better-auth.session_token');

  if (!sessionCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
