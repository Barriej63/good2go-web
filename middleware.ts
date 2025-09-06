import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''; // set in Vercel env

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // only guard /admin/*
  if (!pathname.startsWith('/admin')) return NextResponse.next();

  // allow access if cookie already set
  const cookie = req.cookies.get('g2g_admin')?.value;
  if (cookie && ADMIN_TOKEN && cookie === ADMIN_TOKEN) {
    return NextResponse.next();
  }

  // allow one-time login by query ?token=... (we'll set the cookie and strip the query)
  const token = searchParams.get('token');
  if (token && ADMIN_TOKEN && token === ADMIN_TOKEN) {
    const url = new URL(pathname, req.url); // same path, no query
    const res = NextResponse.redirect(url);
    res.cookies.set('g2g_admin', token, { httpOnly: true, secure: true, sameSite: 'strict', path: '/' });
    return res;
  }

  // otherwise push to /admin/login
  return NextResponse.redirect(new URL('/admin/login', req.url));
}

export const config = {
  matcher: ['/admin/:path*'],
};
