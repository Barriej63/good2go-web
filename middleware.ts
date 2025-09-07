import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'g2g_admin';
const ROLE_COOKIE = 'g2g_role';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let the login page through
  if (pathname === '/admin/login') return NextResponse.next();

  // Only guard admin pages
  if (pathname.startsWith('/admin')) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const role  = req.cookies.get(ROLE_COOKIE)?.value as 'superadmin' | 'coach' | 'viewer' | undefined;

    if (!token || !role) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }

    // Per-route role gates
    if ((pathname.startsWith('/admin/config') || pathname.startsWith('/admin/users')) && role !== 'superadmin') {
      return NextResponse.redirect(new URL('/admin', req.url));
    }

    // Overview & Bookings require coach+
    if ((pathname === '/admin' || pathname.startsWith('/admin/bookings')) && !(role === 'superadmin' || role === 'coach')) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
