// app/api/admin/bookings-export/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function isAdmin() {
  const token = cookies().get('g2g_admin')?.value ?? '';
  const adminToken = process.env.ADMIN_TOKEN ?? '';
  return Boolean(token && adminToken && token === adminToken);
}

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

function toCSV(rows) {
  if (!rows.length) return 'id,createdAt,name,email,date,region,productId,status,amountCents\n';
  const headers = Object.keys(rows[0]);
  const escape = (v) =>
    String(v ?? '')
      .replaceAll('"', '""')
      .replaceAll('\n', ' ');
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map((h) => `"${escape(r[h])}"`).join(','));
  }
  return lines.join('\n');
}

export async function GET(req) {
  if (!isAdmin()) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const since = searchParams.get('since'); // ISO string

  const col = db().collection('bookings');
  let q = col.orderBy('createdAt').limit(5000);
  if (since) q = q.where('createdAt', '>', since);

  const snap = await q.get();
  const rows = snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      createdAt: x.createdAt,
      name: x.name,
      email: x.email,
      date: x.date,
      region: x.region,
      productId: x.productId,
      status: x.status,
      amountCents: x.amountCents,
    };
  });

  const csv = toCSV(rows);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bookings_${Date.now()}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
