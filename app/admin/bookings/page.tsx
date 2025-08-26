// app/admin/bookings/page.tsx
import { getFirestoreFromAny } from '@/lib/firebaseAdminFallback';

export const dynamic = 'force-dynamic';

function formatCents(c:number|undefined|null) {
  if (!c && c !== 0) return '';
  return (c/100).toFixed(2);
}

export default async function AdminBookingsPage() {
  const db = getFirestoreFromAny();
  const items: any[] = [];
  let note: string | null = null;

  if (!db) {
    note = 'Firestore unavailable (check FIREBASE_* env vars).';
  } else {
    try {
      const snap = await (db as any).collection('bookings').orderBy('createdAt','desc').limit(200).get();
      for (const doc of snap.docs) {
        const d = doc.data() || {};
        items.push({
          id: doc.id,
          date: d.date || '',
          start: d.slot?.start || '',
          end: d.slot?.end || '',
          name: d.name || '',
          email: d.email || '',
          region: d.region || '',
          venue: d.venueAddress || '',
          status: d.status || '',
          amountCents: d.amountCents ?? null,
          ref: d.ref || d.reference || '',
        });
      }
    } catch (e:any) {
      note = e?.message || String(e);
    }
  }

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Admin · Bookings</h1>
      <p className="text-sm text-gray-600 mb-4">Read-only list (last 200). Use the reconcile form to attach a Worldline reference to a booking and optionally mark as paid.</p>

      {note && <div className="mb-4 p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">{note}</div>}

      <form action="/api/admin/reconcile" method="get" className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-3 p-3 border rounded">
        <input name="booking" placeholder="Booking doc ID" className="border p-2 rounded md:col-span-2" />
        <input name="ref" placeholder="Worldline Reference" className="border p-2 rounded md:col-span-2" />
        <input name="tx" placeholder="(Optional) TransactionId" className="border p-2 rounded" />
        <div className="flex items-center gap-2">
          <label className="text-sm"><input type="checkbox" name="paid" value="1" className="mr-1"/> Mark paid</label>
        </div>
        <button className="bg-black text-white rounded px-4 py-2 md:col-span-1">Reconcile</button>
      </form>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Time</th>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Region</th>
              <th className="text-left p-2">Status</th>
              <th className="text-right p-2">Amount</th>
              <th className="text-left p-2">Ref</th>
              <th className="text-left p-2">ID</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-2">{b.date}</td>
                <td className="p-2">{b.start}–{b.end}</td>
                <td className="p-2">{b.name}</td>
                <td className="p-2">{b.email}</td>
                <td className="p-2">{b.region}</td>
                <td className="p-2">{b.status}</td>
                <td className="p-2 text-right">${formatCents(b.amountCents)}</td>
                <td className="p-2">{b.ref}</td>
                <td className="p-2">{b.id}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td className="p-4" colSpan={9}>No bookings found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
