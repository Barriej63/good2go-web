import { NextResponse } from 'next/server';
import { isAdminCookie } from '@/lib/adminAuth';
import { getFirestoreSafe } from '@/lib/firebaseAdminFallback';
import { sendEmail } from '@/lib/email';

function csvLine(arr: string[]) { return arr.map(v => `"${v.replace(/"/g, '""')}"`).join(','); }

export async function POST() {
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok:false, error:'unauthorized' }, { status: 401 });

  const db = getFirestoreSafe();
  if (!db) return NextResponse.json({ ok:false, error:'firestore_init_failed' }, { status: 500 });

  const snap = await db.collection('bookings').orderBy('createdAt','desc').limit(1000).get();
  const cols = ['createdAt','name','email','region','dateISO','start','end','venueAddress','slot','id'];
  const rows = [cols.join(',')];

  for (const d of snap.docs) {
    const b:any = { id: d.id, ...d.data() };
    rows.push(csvLine(cols.map(c => String(b[c] ?? ''))));
  }

  const csv = rows.join('\n');
  const to = process.env.BOOKINGS_CSV_TO || process.env.EMAIL_TO || '';
  if (!to) return NextResponse.json({ ok:true, csv }); // if no recipient configured, return CSV payload

  await sendEmail({
    to,
    subject: `Good2Go bookings export — ${new Date().toISOString().slice(0,10)}`,
    html: `<pre style="font-family:ui-monospace,Menlo,Consolas">${csv.replace(/</g,'&lt;')}</pre>`
  });

  return NextResponse.json({ ok:true, emailedTo: to, count: snap.size });
}
