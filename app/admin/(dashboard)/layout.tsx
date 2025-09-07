import Link from 'next/link';

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container">
      <header className="site-header mb-6">
        <div className="site-header-inner">
          <div className="brand">
            <span className="title">Good2Go Admin</span>
          </div>
          <nav style={{ marginLeft: 'auto' }}>
            <div className="btn-row">
              <Link href="/admin" className="btn btn-ghost">Overview</Link>
              <Link href="/admin/bookings" className="btn btn-ghost">Bookings</Link>
              <Link href="/admin/config" className="btn btn-ghost">Config</Link>
              <Link href="/admin/users" className="btn btn-ghost">Users</Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="pb-10">
        {children}
      </main>

      <footer className="site-footer">
        <div className="container site-footer-inner">© {new Date().getFullYear()} Good2Go</div>
      </footer>
    </div>
  );
}

