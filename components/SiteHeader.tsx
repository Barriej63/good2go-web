// /app/components/SiteHeader.tsx
import Link from 'next/link';
import Image from 'next/image';
import { getAdminRole } from '@/lib/adminAuth'; // server-ok

export default async function SiteHeader() {
  const role = await getAdminRole();

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <div className="brand">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/good2go-logo1.png" alt="Good2Go" width={36} height={36} priority />
            <div className="leading-tight">
              <div className="title">Good2Go</div>
              <div className="slogan">Concussion Assessments &amp; Monitoring</div>
            </div>
          </Link>
        </div>

        <nav className="btn-row">
          <Link href="/" className="btn btn-info">Home</Link>
          <Link href="/book" className="btn btn-primary">Book a Test</Link>
          <Link href="/admin" className="btn btn-warn">
            {role ? 'Admin' : 'Clinician/Admin Login'}
          </Link>
        </nav>
      </div>
    </header>
  );
}
