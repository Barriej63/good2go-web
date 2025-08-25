import { NextResponse } from 'next/server';
import { getFirestoreSafe } from '@/lib/firebaseAdminFallback';
export const dynamic = 'force-dynamic';

export async function GET() {
  const dbGet = await getFirestoreSafe();
  if (!dbGet.ok || !dbGet.db) {
    return NextResponse.json({ ok:false, detail: dbGet }, { status: 500 });
  }
  try {
    // Simple round-trip: create a temp doc and read it back
    const coll = (dbGet.db as any).collection('_healthchecks');
    const id = 'hc-' + Date.now();
    await coll.doc(id).set({ createdAt: new Date().toISOString() });
    const snap = await coll.doc(id).get();
    return NextResponse.json({ ok:true, wrote: !!snap.exists, id });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error: e?.message || String(e) }, { status: 500 });
  }
}
