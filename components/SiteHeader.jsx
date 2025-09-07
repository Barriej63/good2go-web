import Image from 'next/image';
import Link from 'next/link';

export default function SiteHeader() {
  return (
    <header className="site-header border-b border-slate-200 bg-white">
      <div className="container flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/good2go-logo1.png"
            alt="Good2Go"
            width={40}
            height={40}
            priority
          />
          <span className="font-bold text-lg text-slate-800">Good2Go</span>
        </Link>
        <nav className="flex gap-4">
          <Link href="/" className="text-slate-600 hover:text-slate-900">Home</Link>
          <Link href="/book" className="text-slate-600 hover:text-slate-900">Book</Link>
          <Link href="/admin" className="text-slate-600 hover:text-slate-900">Admin</Link>
        </nav>
      </div>
    </header>
  );
}


