// app/api/admin/bookings-export/route.ts
import { NextRequest } from 'next/server';
import { getFirestoreFromAny } from '@/lib/firebaseAdminFallback';

export const dynamic = 'force-dynamic';

function okToken(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || req.headers.get('x-admin-token') || '';
  return !!(process.env.ADMIN_TOKEN && token && token === process.env.ADMIN_TOKEN);
}

function toCSVRow(vals: (string|number|null|undefined)[]) {
  return vals.map(v => {
    let s = v == null ? '' : String(v);
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      s = '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }).join(',') + '\n';
}

export async function GET(req: NextRequest) {
  if (!okToken(req)) return new Response('unauthorized', { status: 401 });
  const db = getFirestoreFromAny();
  if (!db) return new Response('no_db', { status: 200 });

  const sp = req.nextUrl.searchParams;
  const limit = Math.min(Math.max(parseInt(sp.get('limit') || '2000', 10), 1), 20000);
  const since = sp.get('since') || '';
  const order = (sp.get('order') || (since ? 'asc' : 'desc')) as 'asc'|'desc';

  const col = db.collection('bookings');
  let q: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = col as unknown as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;
  if (since) q = q.where('createdAt', '>', since);
  q = q.orderBy('createdAt', order).limit(limit);
  const snap = await q.get();
  const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

  const headers = ['id','createdAt','date','start','end','name','email','region','status','amountCents','ref','productId'];
  let csv = toCSVRow(headers);
  for (const it of items) {
    csv += toCSVRow([
      it.id, it.createdAt, it.date, it.start, it.end, it.name, it.email, it.region, it.status, it.amountCents, it.ref, it.productId
    ]);
  }
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="bookings.csv"'
    }
  });
}
