import { redirect } from 'next/navigation';
import { isAdminCookie, getAdminRole } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export default async function ConfigPage() {
  const ok = await isAdminCookie();
  if (!ok) redirect('/admin/login');

  const role = (await getAdminRole()) || 'viewer';

  const pageWrap: React.CSSProperties = { background: '#f1f5f9' };
  const mainWrap: React.CSSProperties = { maxWidth: 1120, margin: '0 auto', padding: '32px 20px 80px' };
  const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, boxShadow: '0 1px 2px rgba(0,0,0,.04)', marginBottom: 24 };

  let Editor: any = null;
  try {
    // Prefer your existing editor
    const mod = await import('./ui/ConfigEditor');
    Editor = mod.default || null;
  } catch {}

  return (
    <div style={pageWrap}>
      <main style={mainWrap}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a' }}>Configuration</h1>
          <p style={{ marginTop: 8, color: '#475569' }}>
            Manage regions, venues and timeslots. Your role: <strong>{role}</strong>
          </p>
        </header>

        <section style={card}>
          {Editor ? (
            <Editor canEdit={role === 'superadmin' || role === 'coach'} />
          ) : (
            <p style={{ margin: 0 }}>
              <em>ConfigEditor.tsx</em> not found. Add it under
              {' '}<code>app/admin/(dashboard)/config/ui/ConfigEditor.tsx</code> to enable editing.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

