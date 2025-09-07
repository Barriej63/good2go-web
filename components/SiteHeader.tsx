import Link from 'next/link';
import Image from 'next/image';
import { getAdminRole } from '@/lib/adminAuth'; // uses next/headers internally (server OK)

export default async function SiteHeader() {
  // Server-side: safe to read cookies / next/headers
  const role = await getAdminRole(); // 'superadmin' | 'coach' | 'viewer' | null

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex items-center justify-between gap-6 py-3 px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/good2go-logo1.png"
              alt="Good2Go"
              width={36}
              height={36}
              priority
            />
            <div className="leading-tight">
              <div className="font-extrabold text-[18px] text-slate-900">Good2Go</div>
              <div className="text-[13px] text-slate-500">Concussion Assessments &amp; Monitoring</div>
            </div>
          </Link>
        </div>

        <nav className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Home
          </Link>
          <Link
            href="/book"
            className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
          >
            Book a Test
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center rounded-xl bg-amber-500 px-4 py-2 text-white hover:bg-amber-600"
          >
            {role ? 'Admin' : 'Clinician/Admin Login'}
          </Link>
        </nav>
      </div>
    </header>
  );
}
