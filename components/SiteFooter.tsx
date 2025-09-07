import Image from 'next/image';
import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white mt-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 h-auto py-5">
          {/* Left: brand */}
          <div className="flex items-center gap-3">
            <Image src="/good2go-logo1.png" alt="Good2Go" width={34} height={34} />
            <div className="text-sm text-slate-500">
              © {new Date().getFullYear()} Good2Go
            </div>
          </div>

          {/* Middle: tagline */}
          <div className="text-xs text-slate-400 text-center">
            Clinical decision support for concussion — simple booking, secure results.
          </div>

          {/* Right: quick links */}
          <div className="flex items-center gap-2">
            <Link href="/book" className="btn btn-primary">Book a Test</Link>
            <Link href="/admin" className="btn btn-ghost">Admin</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}


