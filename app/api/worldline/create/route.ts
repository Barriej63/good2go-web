
// app/api/worldline/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

function envHost(): { host: string; envMode: "production" | "uat" } {
  const mode = (process.env.WORLDLINE_ENV || "uat").toLowerCase();
  const isProd = ["production","prod","live"].includes(mode);
  return { host: isProd ? "https://secure.paymarkclick.co.nz" : "https://secure.uat.paymarkclick.co.nz", envMode: isProd ? "production" : "uat" };
}

function trim50(s: string) { return s.length <= 50 ? s : s.slice(0, 50); }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { productId, amountCents, bookingId, region, date, slot, name, email } = body || {};

    const creds = {
      username: process.env.WORLDLINE_USERNAME || "",
      password: process.env.WORLDLINE_PASSWORD || "",
      account_id: process.env.WORLDLINE_ACCOUNT_ID || "",
    };
    if (!creds.username || !creds.password || !creds.account_id) {
      return NextResponse.json({ ok:false, error: "Missing Worldline env vars" }, { status: 500 });
    }

    const db = getAdminDb();

    // Resolve amount
    let cents: number | null = null;
    if (typeof amountCents === "number") cents = amountCents;
    else if (productId) {
      const prod = await db.collection("products").doc(String(productId)).get();
      const data = prod.exists ? (prod.data() as any) : null;
      if (!data || !data.active || typeof data.priceCents !== "number") {
        return NextResponse.json({ ok:false, error: "Invalid product" }, { status: 400 });
      }
      cents = data.priceCents;
    } else {
      return NextResponse.json({ ok:false, error: "Missing amountCents or productId" }, { status: 400 });
    }

    // Ensure booking
    let bid = bookingId;
    if (!bid) {
      const ref = await db.collection("bookings").add({
        status: "pending",
        createdAt: new Date().toISOString(),
        productId, amountCents: cents, region, date, slot, name, email,
      });
      bid = ref.id;
    } else {
      await db.collection("bookings").doc(bid).set({
        status: "pending",
        updatedAt: new Date().toISOString(),
        productId, amountCents: cents, region, date, slot, name, email,
      }, { merge: true });
    }

    const { host, envMode } = envHost();
    const endpoint = `${host}/api/webpayments/paymentservice/rest/WPRequest`;
    const origin = new URL(req.url).origin;
    const returnUrl = `${origin}/api/worldline/return?bid=${bid}`;

    const form = new URLSearchParams({
      username: creds.username,
      password: creds.password,
      account_id: creds.account_id,
      cmd: "_xclick",
      type: "purchase",
      amount: ((cents as number) / 100).toFixed(2),
      reference: trim50(`BID:${bid}`),
      particular: trim50(`BID:${bid}`),
      return_url: returnUrl,
    });
    if (email) form.set("email", String(email));

    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString() });
    const raw = await res.text();
    if (!res.ok) return NextResponse.json({ ok:false, status: res.status, raw }, { status: 502 });

    const urls = Array.from(raw.matchAll(/\bhttps?:\/\/[^\s<>"']+/gi)).map(m => m[0]);
    const redirectUrl = urls.find(u => /paymarkclick\.co\.nz(:443)?\/webpayments\/default\.aspx\?q=/i.test(u)) || null;
    if (!redirectUrl) return NextResponse.json({ ok:false, error: "No HPP URL", raw }, { status: 502 });

    await db.collection("bookings").doc(bid).set({
      worldline: { create: { at: new Date().toISOString(), endpoint, envMode, redirectUrl } }
    }, { merge: true });

    return NextResponse.json({ ok:true, bookingId: bid, redirectUrl });
  } catch (err: any) {
    return NextResponse.json({ ok:false, error: err?.message }, { status: 500 });
  }
}
