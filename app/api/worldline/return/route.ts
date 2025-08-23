
// app/api/worldline/return/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

async function parseBody(req: NextRequest) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await req.json().catch(()=>({}));
  if (ct.includes("application/x-www-form-urlencoded")) {
    const txt = await req.text();
    const p = new URLSearchParams(txt);
    const obj: any = {};
    p.forEach((v,k)=>{ obj[k]=v; });
    return obj;
  }
  return {};
}

function htmlSuccess(bid?: string) {
  return `<!doctype html><html><body style="font-family:sans-serif;padding:2rem">
    <h1>✅ Booking Successful</h1>
    <p>Thank you! Your booking has been confirmed.</p>
    ${bid? `<p>Reference: <code>${bid}</code></p>`: ""}
    <p>A confirmation email has been sent (if you provided an address).</p>
    <a href="/">Return to Home</a>
  </body></html>`;
}

export async function GET(req: NextRequest) {
  const bid = new URL(req.url).searchParams.get("bid") || undefined;
  if (bid) {
    try {
      const db = getAdminDb();
      await db.collection("bookings").doc(bid).set({ paid:true, status:"paid", paidAt:new Date().toISOString() }, { merge:true });
    } catch {}
  }
  return new NextResponse(htmlSuccess(bid), { status:200, headers:{ "content-type":"text/html" }});
}

export async function POST(req: NextRequest) {
  const body = await parseBody(req);
  const bid = body.bookingId || body.bid || new URL(req.url).searchParams.get("bid");
  if (bid) {
    try {
      const db = getAdminDb();
      await db.collection("bookings").doc(bid).set({ paid:true, status:"paid", paidAt:new Date().toISOString() }, { merge:true });
    } catch {}
  }
  return new NextResponse(htmlSuccess(bid), { status:200, headers:{ "content-type":"text/html" }});
}
