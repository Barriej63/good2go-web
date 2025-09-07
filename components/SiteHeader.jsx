'use client';

import { usePathname } from 'next/navigation';

export default function SiteHeader() {
  const pathname = usePathname() || '/';
  if (pathname.startsWith('/admin')) return null; // admin has its own chrome

  return (
    <header className="border-b bg-gradient-to-r from-sky-600 to-sky-500 text-white">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center">
        <span className="text-lg font-semibold tracking-tight">Good2Go</span>
        <span className="ml-3 hidden md:inline text-white/80">
          Recover Smart. Return Strong.
        </span>
      </div>
    </header>
  );
}

