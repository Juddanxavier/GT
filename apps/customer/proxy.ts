import { NextResponse, type NextRequest } from 'next/server';

const tenantByDomain: Record<string, string> = {
  'gajantraders.com': 'gajan-traders',
  'www.gajantraders.com': 'gajan-traders',
  'lankamahal.lk': 'lanka-mahal',
  'www.lankamahal.lk': 'lanka-mahal',
};

export function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? 'localhost:3002';
  const domain = host.split(':')[0] ?? host;

  let tenant = tenantByDomain[domain];

  if (!tenant) {
    tenant = request.nextUrl.searchParams.get('__tenant') ?? 'gajan-traders';
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-slug', tenant);
  requestHeaders.set('x-tenant', tenant);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
