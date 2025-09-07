'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SiteHeader() {
  const pathname = usePathname() || '/';

  // Hide the public site header on /admin pages so headers don't stack
  if (pathname.startsWith('/admin')) return null;

  return (
    <header className="border-b bg-gradient-to-r from-sky-600 to-sky-500 text-white">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* If you have a logo in /public/logo.svg, uncomment */}
          {/* <img src="/logo.svg" alt="Good2Go" className="h-6 w-6" /> */}
          <span className="text-lg font-semibold tracking-tight">Good2Go</span>
          <span className="hidden md:inline text-white/80">Recover Smart. Return Strong.</span>
        </div>

        <nav className="flex items-center gap-3">
          <Link
            href="/book"
            className="rounded-lg bg-white/95 text-sky-700 hover:bg-white px-4 py-2 text-sm font-medium shadow-sm"
          >
            Book a Test
          </Link>
          <Link
            href="/admin/login"
            className="rounded-lg border border-white/50 text-white hover:bg-white/10 px-4 py-2 text-sm font-medium"
          >
            Clinician/Admin Login
          </Link>
        </nav>
      </div>
    </header>
  );
}

