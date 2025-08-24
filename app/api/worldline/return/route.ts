// app/api/worldline/return/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function markPaid(bid: string): Promise<void> {
  if (!bid) return;
  try {
    const db = getAdminDb();
    await db.collection('bookings').doc(bid).set({ status: 'paid', paidAt: new Date() }, { merge: true });
  } catch {}
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const bid = url.searchParams.get('bid') || url.searchParams.get('ref') || '';
  if (bid) await markPaid(bid);

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Booking Successful</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:2rem}.box{max-width:720px;margin:0 auto}</style></head>
  <body><div class="box"><h1>Booking Successful</h1><p>Thank you! Your booking has been confirmed.</p>
  <p>Reference: <strong>${bid}</strong></p><p><a href="/success?ref=${encodeURIComponent(bid)}">Continue</a></p></div></body></html>`;
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
}
