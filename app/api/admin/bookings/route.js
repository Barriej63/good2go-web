// app/api/admin/bookings/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// --- Admin cookie check (no external helpers)
function isAdmin() {
  const token = cookies().get('g2g_admin')?.value ?? '';
  const adminToken = process.env.ADMIN_TOKEN ?? '';
  return Boolean(token && adminToken && token === adminToken);
}

// --- Firebase Admin init (safe with either ADC or service-account envs)
function db() {
  if (!getApps().length) {
    const hasSA =
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY;

    initializeApp(
      hasSA
        ? {
            credential: cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
          }
        : { credential: applicationDefault() }
    );
  }
  return getFirestore();
}

export async function GET(req) {
  if (!isAdmin()) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? 100), 1000);
  const since = searchParams.get('since'); // ISO string from our data model

  const col = db().collection('bookings');
  // createdAt is stored as ISO string in your dataset, so lexicographic works
  let q = col.orderBy('createdAt').limit(limit);
  if (since) q = q.where('createdAt', '>', since);

  const snap = await q.get();
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return NextResponse.json({
    ok: true,
    count: items.length,
    items,
    nextSince: items.length ? items[items.length - 1].createdAt : since ?? null,
  });
}
