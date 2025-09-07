import Image from 'next/image';
import Link from 'next/link';

export default function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Left: Logo + Brand block */}
          <div className="flex items-center gap-3">
            <Link href="/" className="shrink-0">
              <Image
                src="/good2go-logo1.png"
                alt="Good2Go"
                width={44}
                height={44}
                priority
              />
            </Link>
            <div className="leading-tight">
              <div className="font-extrabold text-xl text-slate-900">Good2Go</div>
              <div className="text-xs text-slate-500">Concussion Assessments &amp; Monitoring</div>
            </div>
          </div>

          {/* Right: Buttons */}
          <nav className="flex items-center gap-2">
            <Link href="/" className="btn btn-info">Home</Link>
            <Link href="/book" className="btn btn-primary">Book a Test</Link>
            <Link href="/admin" className="btn btn-warn">Admin</Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
