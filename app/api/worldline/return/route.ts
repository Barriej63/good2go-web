
// app/api/worldline/return/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

async function markPaid(bid: string) {
  const db = getAdminDb();
  await db.collection("bookings").doc(bid).set({
    status: "paid",
    paidAt: new Date()
  }, { merge: true });
}

function html(bid?: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Booking Successful</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:40px} .card{max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:16px;padding:24px}</style></head><body><div class="card"><h1>✅ Booking Successful</h1><p>Thank you! Your booking has been confirmed.</p>${bid?`<p>Reference: <code>${bid}</code></p>`:""}<p>You can close this page.</p><p><a href="/">Return to Home</a></p></div></body></html>`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const bid = url.searchParams.get("bid") || undefined;
  try { if (bid) await markPaid(bid); } catch {}
  return new NextResponse(html(bid), { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}
export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") || "";
    let body: any = {}; let raw = "";
    if (ct.includes("application/json")) { body = await req.json().catch(()=>({})); raw = JSON.stringify(body); }
    else if (ct.includes("application/x-www-form-urlencoded")) { const t = await req.text(); raw = t; body = Object.fromEntries(new URLSearchParams(t)); }
    const bid = String(body.bookingId || body.bid || "");
    if (bid) { try { await markPaid(bid); } catch {} }
    return new NextResponse(html(bid || undefined), { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  } catch {
    return new NextResponse(html(), { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  }
}
