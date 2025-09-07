import { redirect } from 'next/navigation';
import { isAdminCookie, getAdminRole } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

async function tryFetchUsers() {
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/admin/users`, {
      cache: 'no-store'
    });
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j?.users) ? j.users : [];
  } catch {
    return [];
  }
}

export default async function UsersPage() {
  const ok = await isAdminCookie();
  if (!ok) redirect('/admin/login');
  const role = (await getAdminRole()) || 'viewer';

  const pageWrap: React.CSSProperties = { background: '#f1f5f9' };
  const mainWrap: React.CSSProperties = { maxWidth: 1120, margin: '0 auto', padding: '32px 20px 80px' };
  const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,.04)', marginBottom: 24 };

  const users = await tryFetchUsers();

  return (
    <div style={pageWrap}>
      <main style={mainWrap}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a' }}>Users &amp; Roles</h1>
          <p style={{ marginTop: 8, color: '#475569' }}>
            Your role: <strong>{role}</strong>
          </p>
        </header>

        <section style={card}>
          {users.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', background: '#f8fafc' }}>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Name</th>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Email</th>
                    <th style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any, i: number) => (
                    <tr key={i}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{u.name || '-'}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{u.email || '-'}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{u.role || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div>
              <p style={{ marginTop: 0 }}>
                No user directory endpoint found. You can still control access with environment tokens:
              </p>
              <ul style={{ marginTop: 8, paddingLeft: 18, lineHeight: 1.6 }}>
                <li><code>ADMIN_TOKEN</code> → <strong>superadmin</strong></li>
                <li><code>COACH_TOKEN</code> → <strong>coach</strong></li>
                <li><code>VIEWER_TOKEN</code> → <strong>viewer</strong></li>
              </ul>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
