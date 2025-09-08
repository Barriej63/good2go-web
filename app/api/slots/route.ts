// app/api/slots/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import type { Firestore, QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

function ensureAuth(req: NextRequest) {
  const want = process.env.ADMIN_TOKEN || '';
  const got = req.headers.get('x-admin-token') || '';
  if (!want || got !== want) {
    return unauthorized();
  }
  return null;
}

type SlotDef = {
  weekday: number | string;
  start: string;
  end: string;
  venueAddress?: string;
  note?: string;
};

function normalizeWeekday(w: number | string): number {
  if (typeof w === 'number') return Math.max(0, Math.min(6, w));
  const map: Record<string, number> = {
    sunday: 0, sun: 0,
    monday: 1, mon: 1,
    tuesday: 2, tue: 2, tues: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thu: 4, thurs: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6,
  };
  return map[w.toLowerCase()] ?? 0;
}

function isHHMM(v: unknown): v is string {
  return typeof v === 'string' && /^\d{2}:\d{2}$/.test(v);
}

function docIdForRegion(region: string) {
  return `timeslots_${region}`;
}

export async function GET(req: NextRequest) {
  const authErr = ensureAuth(req);
  if (authErr) return authErr;

  const db = getAdminDb() as unknown as Firestore;
  const snap = await db.collection('config').get();

  const out: Array<{ id: string; data: DocumentData }> = [];
  const docs = snap.docs as QueryDocumentSnapshot<DocumentData>[];
  for (const d of docs) {
    const id = d.id;
    if (!/^timeslots[_-]/i.test(id)) continue;
    out.push({ id, data: d.data() });
  }

  return NextResponse.json({ docs: out });
}

export async function POST(req: NextRequest) {
  const authErr = ensureAuth(req);
  if (authErr) return authErr;

  const body = await req.json();
  const { region, slot } = body || {};
  if (!region || !slot) {
    return NextResponse.json({ error: 'missing region or slot' }, { status: 400 });
  }

  const db = getAdminDb() as unknown as Firestore;
  const docRef = db.collection('config').doc(docIdForRegion(region));
  const docSnap = await docRef.get();

  const addSlot: SlotDef = {
    weekday: normalizeWeekday(slot.weekday),
    start: String(slot.start),
    end: String(slot.end),
    venueAddress: slot.venueAddress || '',
    note: slot.note || '',
  };

  if (!docSnap.exists) {
    await docRef.set({ slots: [addSlot] }, { merge: true });
  } else {
    const data = docSnap.data() || {};
    const arr: SlotDef[] = Array.isArray(data.slots) ? data.slots : [];
    arr.push(addSlot);
    await docRef.set({ slots: arr }, { merge: true });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const authErr = ensureAuth(req);
  if (authErr) return authErr;

  const body = await req.json();
  const { region, index } = body || {};
  if (!region || typeof index !== 'number') {
    return NextResponse.json({ error: 'missing region or index' }, { status: 400 });
  }

  const db = getAdminDb() as unknown as Firestore;
  const docRef = db.collection('config').doc(docIdForRegion(region));
  const docSnap = await docRef.get();
  if (!docSnap.exists) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const data = docSnap.data() || {};
  const arr: SlotDef[] = Array.isArray(data.slots) ? data.slots : [];
  if (index < 0 || index >= arr.length) {
    return NextResponse.json({ error: 'index_out_of_range' }, { status: 400 });
  }

  const current = arr[index] || {};

  // Build an updated slot. Allow weekday/start/end edits too.
  let next: SlotDef = { ...current };

  if (body.weekday !== undefined) {
    const wd = normalizeWeekday(body.weekday);
    if (Number.isFinite(wd)) next.weekday = wd;
  }
  if (body.start !== undefined) {
    if (isHHMM(body.start)) next.start = String(body.start);
    else return NextResponse.json({ error: 'invalid_start' }, { status: 400 });
  }
  if (body.end !== undefined) {
    if (isHHMM(body.end)) next.end = String(body.end);
    else return NextResponse.json({ error: 'invalid_end' }, { status: 400 });
  }
  if (body.venueAddress !== undefined) {
    next.venueAddress = typeof body.venueAddress === 'string' ? body.venueAddress : current.venueAddress;
  }
  if (body.note !== undefined) {
    next.note = typeof body.note === 'string' ? body.note : current.note;
  }

  arr[index] = next;
  await docRef.set({ slots: arr }, { merge: true });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const authErr = ensureAuth(req);
  if (authErr) return authErr;

  const { searchParams } = new URL(req.url);
  const region = searchParams.get('region');
  const idxStr = searchParams.get('index');
  if (!region || idxStr === null) {
    return NextResponse.json({ error: 'missing region or index' }, { status: 400 });
  }
  const index = Number(idxStr);

  const db = getAdminDb() as unknown as Firestore;
  const docRef = db.collection('config').doc(docIdForRegion(region));
  const docSnap = await docRef.get();
  if (!docSnap.exists) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const data = docSnap.data() || {};
  const arr: SlotDef[] = Array.isArray(data.slots) ? data.slots : [];
  if (index < 0 || index >= arr.length) {
    return NextResponse.json({ error: 'index_out_of_range' }, { status: 400 });
  }
  arr.splice(index, 1);
  await docRef.set({ slots: arr }, { merge: true });

  return NextResponse.json({ ok: true });
}
