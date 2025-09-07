'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SiteHeader() {
  const pathname = usePathname() || '/';
  if (pathname.startsWith('/admin')) return null; // admin has its own chrome

  const onBook = pathname === '/book';
  const onAdminLogin = pathname === '/admin/login';

  return (
    <header className="border-b bg-gradient-to-r from-sky-600 to-sky-500 text-white">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight">Good2Go</span>
          <span className="hidden md:inline text-white/80">Recover Smart. Return Strong.</span>
        </div>
        <nav className="flex items-center gap-3">
          {!onBook && (
            <Link href="/book" className="btn btn-primary shadow-sm">Book a Test</Link>
          )}
          {!onAdminLogin && (
            <Link href="/admin/login" className="btn btn-ghost">Clinician/Admin Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
