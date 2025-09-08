import { isAdminCookie, getAdminRole } from '@/lib/adminAuth';
import ClientSignIn from './ClientSignIn';

function styles() {
  const pageWrap: React.CSSProperties = { background: '#f1f5f9', minHeight: '100%' };
  const mainWrap: React.CSSProperties = { maxWidth: 560, margin: '0 auto', padding: '48px 20px 96px' };
  const card: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 1px 2px rgba(0,0,0,.04)',
  };
  const title: React.CSSProperties = { margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a' };
  const sub: React.CSSProperties = { marginTop: 8, color: '#475569' };
  return { pageWrap, mainWrap, card, title, sub };
}

export default async function AdminLoginPage() {
  const ok = await isAdminCookie();
  const role = ok ? await getAdminRole() : null;
  const { pageWrap, mainWrap, card, title, sub } = styles();

  if (ok && role) {
    return (
      <div style={pageWrap}>
        <main style={mainWrap}>
          <header style={{ marginBottom: 24 }}>
            <h1 style={title}>Admin</h1>
            <p style={sub}>You’re already signed in as <strong>{role}</strong>.</p>
          </header>
          <section style={card}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a
                href="/admin"
                style={{ padding: '10px 16px', borderRadius: 10, background: '#0284c7', color: '#fff', textDecoration: 'none' }}
              >
                Go to dashboard
              </a>
              <form action="/api/admin/logout" method="POST" style={{ margin: 0 }}>
                <button
                  type="submit"
                  style={{ padding: '10px 16px', borderRadius: 10, background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                >
                  Logout
                </button>
              </form>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      <main style={mainWrap}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={title}>Admin Login</h1>
          <p style={sub}>Enter your one-time admin token.</p>
        </header>
        <section style={card}>
          {/* Client-side form that posts to /api/admin/login */}
          <ClientSignIn />
        </section>
      </main>
    </div>
  );
}
