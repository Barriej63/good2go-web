'use client';
import Link from 'next/link';
import Image from 'next/image';
import { SITE } from '@/content/siteContent';

export default function SiteHeader() {
  return (
    <header className="border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          {/* Logo if available */}
          <div className="w-8 h-8 relative">
            <Image src={SITE.logoPath} alt="Good2Go" fill className="object-contain" onError={() => {}} />
          </div>
          <span className="font-semibold">{SITE.name}</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/#how">How it works</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/booking" className="px-3 py-1.5 rounded-xl bg-black text-white">Book</Link>
        </nav>
      </div>
    </header>
  );
}
