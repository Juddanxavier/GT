import { NextResponse } from 'next/server';

// ponytail: proxy disabled — client-side auth in dashboard layout handles protection
export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
