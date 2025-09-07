import Image from 'next/image';
import Link from 'next/link';

export default function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-nowrap items-center gap-6 py-4">
          {/* Brand (left) */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <Image src="/good2go-logo1.png" alt="Good2Go" width={44} height={44} priority />
            <div className="leading-tight">
              <div className="font-extrabold text-xl tracking-tight text-slate-900">Good2Go</div>
              <div className="text-xs text-slate-500">Concussion assessments & monitoring</div>
            </div>
          </Link>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Nav (right) — colored buttons */}
          <nav className="flex items-center gap-2 flex-nowrap">
            <Link href="/" className="btn btn-info">Home</Link>
            <Link href="/book" className="btn btn-primary">Book a Test</Link>
            <Link href="/admin" className="btn btn-warn">Admin</Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
