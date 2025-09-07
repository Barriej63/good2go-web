// /app/api/admin/reminders/route.ts
import { NextResponse } from 'next/server';
import { isAdminCookie } from '@/lib/adminAuth';
import { getFirestoreSafe } from '@/lib/firebaseAdminFallback';
import { sendEmail, reminderHtml } from '@/lib/email';

function pad2(n: number){ return String(n).padStart(2,'0'); }
function combine(dateISO: string, startHHMM: string): string {
  // returns ISO timestamp like "2025-09-07T17:30:00.000Z" (assumes local time -> UTC)
  const [h,m] = (startHHMM || '09:00').split(':').map(x=>parseInt(x,10));
  const [Y,M,D] = dateISO.split('-').map(x=>parseInt(x,10));
  const d = new Date(Y, (M-1), D, h, m, 0);
  return d.toISOString();
}

export async function POST() {
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok:false, error:'unauthorized' }, { status: 401 });

  const db = getFirestoreSafe();
  if (!db) return NextResponse.json({ ok:false, error:'firestore_init_failed' }, { status: 500 });

  const now = new Date();
  const t24 = new Date(now.getTime() + 24*3600*1000);
  const t25 = new Date(now.getTime() + 25*3600*1000);

  // Pull recent ~ few hundred to avoid heavy scans. If you have many, consider a date index.
  const snap = await db.collection('bookings')
    .orderBy('createdAt', 'desc')
    .limit(800)
    .get();

  let sent = 0, considered = 0, candidates: any[] = [];

  snap.forEach(doc => {
    const b:any = doc.data();
    if (!b?.email || !b?.dateISO || !b?.start) return;
    const startIso = combine(b.dateISO, b.start);
    const startTime = new Date(startIso);
    const within = startTime >= t24 && startTime < t25;
    if (within) candidates.push({ id: doc.id, ...b, startTime });
  });

  for (const b of candidates) {
    considered++;
    if (b.reminderSent === true) continue;
    try {
      await sendEmail({
        to: b.email,
        subject: 'Reminder: Good2Go assessment in 24 hours',
        html: reminderHtml({
          name: b.name || '',
          dateISO: b.dateISO,
          start: b.start,
          end: b.end || '',
          venue: b.venueAddress || b.venue || '',
        }),
      });
      await db.collection('bookings').doc(b.id).set({
        reminderSent: true,
        reminderSentAt: new Date().toISOString(),
      }, { merge: true });
      sent++;
    } catch (e:any) {
      console.warn('reminder send failed', b.id, e?.message || String(e));
    }
  }

  return NextResponse.json({ ok:true, considered, sent });
}
