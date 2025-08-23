import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { weekdayToNumber } from '@/lib/weekdays';

export const dynamic = 'force-dynamic';

function requireKey(req: Request) {
  const key = process.env.ADMIN_KEY;
  const hdr = (req.headers.get('x-admin-key') || '').trim();
  if (!key || hdr !== key) {
    throw new Error('unauthorized');
  }
}

export async function GET(req: Request) {
  try {
    requireKey(req);
    const db = getAdminDb();
    const col = db.collection('config');
    const snap = await col.get();
    const docs: any[] = [];
    snap.forEach((d: any) => docs.push({ id: d.id, data: d.data() }));
    return NextResponse.json({ ok: true, docs });
  } catch (e:any) {
    const status = e.message === 'unauthorized' ? 401 : 500;
    return NextResponse.json({ ok: false, error: e.message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    requireKey(req);
    const body = await req.json();
    const { region, slot } = body || {};
    if (!region || !slot) return NextResponse.json({ ok:false, error:'missing region/slot' }, { status:400 });

    const db = getAdminDb();
    const docId = `timeslots_${region}`;
    const ref = db.collection('config').doc(docId);
    const snap = await ref.get();
    const existing = snap.exists ? snap.data() : {};

    const arr = Array.isArray(existing.slots) ? existing.slots : [];
    arr.push({
      weekday: slot.weekday,
      start: slot.start,
      end: slot.end,
      venueAddress: slot.venueAddress || '',
      note: slot.note || '',
    });
    await ref.set({ ...existing, slots: arr }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (e:any) {
    const status = e.message === 'unauthorized' ? 401 : 500;
    return NextResponse.json({ ok:false, error:e.message }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    requireKey(req);
    const { searchParams } = new URL(req.url);
    const region = searchParams.get('region');
    const index = Number(searchParams.get('index'));
    if (!region || Number.isNaN(index)) return NextResponse.json({ ok:false, error:'missing region/index' }, { status:400 });

    const db = getAdminDb();
    const ref = db.collection('config').doc(`timeslots_${region}`);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ ok:false, error:'not_found' }, { status:404 });
    const data:any = snap.data();
    const arr:any[] = Array.isArray(data.slots) ? data.slots : [];
    if (index < 0 || index >= arr.length) return NextResponse.json({ ok:false, error:'bad_index' }, { status:400 });
    arr.splice(index,1);
    await ref.set({ ...data, slots: arr }, { merge: true });
    return NextResponse.json({ ok:true });
  } catch (e:any) {
    const status = e.message === 'unauthorized' ? 401 : 500;
    return NextResponse.json({ ok:false, error:e.message }, { status });
  }
}
