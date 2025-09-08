// /app/admin/login/page.tsx  (SERVER COMPONENT)

import { isAdminCookie, getAdminRole } from '@/lib/adminAuth';
import ClientSignIn from './ClientSignIn';

const styles = {
  pageWrap: { background: '#f1f5f9', minHeight: '100%' } as React.CSSProperties,
  mainWrap: { maxWidth: 560, margin: '0 auto', padding: '48px 20px 96px' } as React.CSSProperties,
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 1px 2px rgba(0,0,0,.04)',
  } as React.CSSProperties,
  title: { margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a' } as React.CSSProperties,
  sub: { marginTop: 8, color: '#475569' } as React.CSSProperties,
};

export default async function AdminLoginPage() {
  const ok = await isAdminCookie();
  const role = ok ? await getAdminRole() : null;

  if (ok && role) {
    return (
      <div style={styles.pageWrap}>
        <main style={styles.mainWrap}>
          <header style={{ marginBottom: 24 }}>
            <h1 style={styles.title}>Admin</h1>
            <p style={styles.sub}>You’re already signed in as <strong>{role}</strong>.</p>
          </header>

          <section style={styles.card}>
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
                  style={{
                    padding: '10px 16px',
                    borderRadius: 10,
                    background: '#fff',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer',
                  }}
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

  // Not signed in -> show token form
  return (
    <div style={styles.pageWrap}>
      <main style={styles.mainWrap}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={styles.title}>Admin Login</h1>
          <p style={styles.sub}>Enter your one-time admin token.</p>
        </header>

        <section style={styles.card}>
          {/* client component */}
          <ClientSignIn />
        </section>
      </main>
    </div>
  );
}
