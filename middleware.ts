// middleware.ts (root of the repo)
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect /admin/* pages EXCEPT the login page itself
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = req.cookies.get('g2g_admin')?.value;
    if (!token || token !== process.env.ADMIN_TOKEN) {
      const url = new URL('/admin/login', req.url);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Guard admin pages only; do NOT guard API here (routes already check auth)
  matcher: ['/admin/:path*'],
};
