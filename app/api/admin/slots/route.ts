import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { toWeekdayNumber } from '@/lib/weekdays';

export const dynamic = 'force-dynamic';

function auth(req: Request) {
  const hdr = (req.headers.get('x-admin-token') || '').trim();
  const token = process.env.ADMIN_TOKEN || '';
  return token && hdr && hdr === token;
}

function docIdForRegion(region: string) {
  return 'timeslots_' + region;
}

export async function GET(req: Request) {
  if (!auth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = getAdminDb();
  const snap = await db.collection('config').get();
  const out: any[] = [];
  snap.forEach(d => {
    if (!/^timeslots[_-]/i.test(d.id)) return;
    out.push({ id: d.id, data: d.data() });
  });
  return NextResponse.json({ ok: true, docs: out });
}

export async function POST(req: Request) {
  if (!auth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const { region, weekday, start, end, venueAddress = '', note = '' } = body || {};
  const wd = toWeekdayNumber(weekday);
  if (!region || wd===null || !start || !end) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  const db = getAdminDb();
  const ref = db.collection('config').doc(docIdForRegion(region));
  const doc = await ref.get();

  let slots: any[] = [];
  if (doc.exists) {
    const data = doc.data() || {};
    if (Array.isArray(data.slots)) slots = data.slots;
    else if (data.start && data.end && (data.weekday || data.weekdays)) {
      const wdTop = toWeekdayNumber(data.weekday ?? data.weekdays);
      if (wdTop !== null) slots.push({ weekday: wdTop, start: data.start, end: data.end, venueAddress: data.venueAddress || '', note: data.note || '' });
    }
  }
  slots.push({ weekday: wd, start, end, venueAddress, note });
  await ref.set({ slots }, { merge: true });
  return NextResponse.json({ ok: true, count: slots.length });
}

export async function PATCH(req: Request) {
  if (!auth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const { region, index, venueAddress, note } = body || {};
  if (!region || typeof index !== 'number') return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  const db = getAdminDb();
  const ref = db.collection('config').doc(docIdForRegion(region));
  const doc = await ref.get();
  if (!doc.exists) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const data = doc.data() || {};
  let slots: any[] = [];
  if (Array.isArray(data.slots)) slots = data.slots;
  else if (data.start && data.end && (data.weekday || data.weekdays)) {
    const wdTop = toWeekdayNumber(data.weekday ?? data.weekdays);
    if (wdTop !== null) slots.push({ weekday: wdTop, start: data.start, end: data.end, venueAddress: data.venueAddress || '', note: data.note || '' });
  }
  if (index < 0 || index >= slots.length) return NextResponse.json({ error: 'bad_index' }, { status: 400 });
  if (typeof venueAddress === 'string') slots[index].venueAddress = venueAddress;
  if (typeof note === 'string') slots[index].note = note;
  await ref.set({ slots }, { merge: true });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!auth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const region = searchParams.get('region');
  const indexStr = searchParams.get('index');
  if (!region || indexStr === null) return NextResponse.json({ error: 'invalid_params' }, { status: 400 });
  const index = parseInt(indexStr, 10);
  const db = getAdminDb();
  const ref = db.collection('config').doc(docIdForRegion(region));
  const doc = await ref.get();
  if (!doc.exists) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const data = doc.data() || {};
  let slots: any[] = [];
  if (Array.isArray(data.slots)) slots = data.slots;
  else if (data.start && data.end && (data.weekday || data.weekdays)) {
    const wdTop = toWeekdayNumber(data.weekday ?? data.weekdays);
    if (wdTop !== null) slots.push({ weekday: wdTop, start: data.start, end: data.end, venueAddress: data.venueAddress || '', note: data.note || '' });
  }
  if (isNaN(index) || index < 0 || index >= slots.length) return NextResponse.json({ error: 'bad_index' }, { status: 400 });
  slots.splice(index, 1);
  await ref.set({ slots }, { merge: true });
  return NextResponse.json({ ok: true, count: slots.length });
}
