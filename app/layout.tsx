import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Good2Go — Concussion Monitoring',
  description: 'Bookings and info',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container site-header-inner">
            <Link href="/" className="brand" aria-label="Good2Go Home">
              <img src="/good2go-logo.svg" alt="Good2Go" />
              <span className="title">Good2Go</span>
            </Link>
            <div className="slogan">Recover Smart. Return Strong.</div>
            <div style={{ marginLeft: 'auto' }} className="btn-row">
              <Link className="btn btn-ghost" href="/book">Book</Link>
              <Link className="btn btn-ghost" href="/admin/login">Admin</Link>
            </div>
          </div>
        </header>

        {children}

        <footer className="site-footer">
          <div className="container site-footer-inner">
            © {new Date().getFullYear()} Good2Go
          </div>
        </footer>
      </body>
    </html>
  );
}
