import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function GET(req: NextRequest) {
  return proxy(req);
}
export async function POST(req: NextRequest) {
  return proxy(req);
}
export async function PUT(req: NextRequest) {
  return proxy(req);
}
export async function PATCH(req: NextRequest) {
  return proxy(req);
}
export async function DELETE(req: NextRequest) {
  return proxy(req);
}
export async function OPTIONS(req: NextRequest) {
  return proxy(req);
}
export async function HEAD(req: NextRequest) {
  return proxy(req);
}

async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const path = pathname.replace(/^\/api\/auth/, '/api/auth');
  const target = `${API_BASE}${path}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  headers.set('host', new URL(API_BASE).host);
  headers.delete('cookie');

  const cookie = req.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);

  const body = req.body && req.method !== 'GET' && req.method !== 'HEAD'
    ? await req.arrayBuffer()
    : undefined;

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body,
    redirect: 'manual',
  });

  const resHeaders = new Headers(upstream.headers);
  resHeaders.delete('content-encoding');

  const setCookies = upstream.headers.getSetCookie?.() ?? [];
  if (setCookies.length > 0) {
    resHeaders.delete('set-cookie');
    for (const c of setCookies) {
      const fixed = c.replace(/;\s*Domain=[^;]+/i, '');
      resHeaders.append('set-cookie', fixed);
    }
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  });
}
