// app/admin/bookings/page.tsx
import Link from 'next/link';

async function fetchFeed(since?: string) {
  const p = new URLSearchParams();
  if (since) p.set('since', since);
  p.set('limit', '200');
  const res = await fetch(`/api/admin/bookings?${p.toString()}`, { cache: 'no-store' });
  return res.json();
}

export default async function AdminBookings() {
  const data = await fetchFeed();
  const items = data?.items ?? [];

  return (
    <main style={{ maxWidth: 980, margin: '32px auto', padding: '0 16px', fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: 16 }}>Bookings</h1>
      <p style={{ marginBottom: 16 }}>
        <Link href="/admin">← Back to Admin</Link>
      </p>

      <div style={{ overflowX: 'auto', border: '1px solid #eee', borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={th}>createdAt</th>
              <th style={th}>name</th>
              <th style={th}>email</th>
              <th style={th}>date</th>
              <th style={th}>region</th>
              <th style={th}>status</th>
              <th style={th}>amountCents</th>
              <th style={th}>id</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b: any) => (
              <tr key={b.id}>
                <td style={td}>{b.createdAt}</td>
                <td style={td}>{b.name}</td>
                <td style={td}>{b.email}</td>
                <td style={td}>{b.date}</td>
                <td style={td}>{b.region}</td>
                <td style={td}>{b.status}</td>
                <td style={td}>{b.amountCents}</td>
                <td style={td}>{b.id}</td>
              </tr>
            ))}
            {!items.length && (
              <tr><td colSpan={8} style={td}>No bookings found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', fontWeight: 600, fontSize: 14, borderBottom: '1px solid #eee' };
const td: React.CSSProperties = { padding: '10px 12px', fontSize: 14, borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' };
