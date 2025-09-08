// /app/admin/(dashboard)/config/page.tsx  (SERVER COMPONENT)
import React from 'react';
import { redirect } from 'next/navigation';
import { isAdminCookie, getAdminRole, requireSuperadmin } from '@/lib/adminAuth';

// If you have your editor UI, keep this import. Otherwise comment it out.
// import ConfigEditor from './ui/ConfigEditor';

export default async function ConfigPage() {
  const ok = await isAdminCookie();
  if (!ok) redirect('/admin/login');

  const role = await getAdminRole();
  const canEdit = requireSuperadmin(role);

  return (
    <div style={{ background: '#f1f5f9', minHeight: '100%' }}>
      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 20px 80px' }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#0f172a' }}>Configuration</h1>
          <p style={{ marginTop: 8, color: '#475569' }}>
            {canEdit ? 'You can edit settings.' : 'Read-only access.'}
          </p>
        </header>

        {/* If you have a real editor: */}
        {/* <ConfigEditor canEdit={canEdit} /> */}

        {/* Temporary placeholder so the build succeeds even if you don’t have the editor file yet */}
        <section style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          padding: 20,
          boxShadow: '0 1px 2px rgba(0,0,0,.04)',
        }}>
          <div style={{ color: '#334155' }}>
            <p><strong>Role:</strong> {role ?? 'unknown'}</p>
            <p>This is a placeholder. Drop your ConfigEditor here and pass <code>canEdit</code>.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
