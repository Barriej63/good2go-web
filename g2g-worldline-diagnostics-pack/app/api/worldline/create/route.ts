// app/api/worldline/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

/**
 * WPRequest create with diagnostics:
 * - Accepts productId (looks up price) or amountCents.
 * - Auto-creates pending booking if bookingId is missing.
 * - Calls /api/webpayments/paymentservice/rest/WPRequest.
 * - Stores chosen redirectUrl/endpoint/env under bookings/<id>.worldline.create
 * - Returns { ok, bookingId, redirectUrl, endpoint, envMode }.
 */

function envHost(): { host: string; envMode: "production" | "uat" } {
  const mode = (process.env.WORLDLINE_ENV || "uat").toLowerCase();
  const isProd = ["production","prod","live"].includes(mode);
  return { host: isProd ? "https://secure.paymarkclick.co.nz" : "https://secure.uat.paymarkclick.co.nz", envMode: isProd ? "production" : "uat" };
}

function trim50(s: string) { return s.length <= 50 ? s : s.slice(0, 50); }

function ensureReturnUrl(baseUrl: string | undefined, bookingId: string, origin: string): string {
  const fallback = process.env.PUBLIC_RETURN_URL || `${origin}/api/worldline/return`; // default to API handler
  const raw = baseUrl || fallback;
  if (raw.includes("{bookingId}")) return raw.replace("{bookingId}", encodeURIComponent(bookingId));
  try {
    const u = new URL(raw);
    if (!u.searchParams.get("bid")) u.searchParams.set("bid", bookingId);
    return u.toString();
  } catch {
    const u = new URL(raw.startsWith("/") ? raw : `/${raw}`, origin);
    u.searchParams.set("bid", bookingId);
    return u.toString();
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      productId,
      amountCents,
      bookingId,
      region, date, slot, name, email,
      returnUrl,
    } = body || {};

    const creds = {
      username: process.env.WORLDLINE_USERNAME || "",
      password: process.env.WORLDLINE_PASSWORD || "",
      account_id: process.env.WORLDLINE_ACCOUNT_ID || "",
    };
    if (!creds.username || !creds.password || !creds.account_id) {
      return NextResponse.json({ ok:false, error: "Missing Worldline env. Set WORLDLINE_USERNAME, WORLDLINE_PASSWORD, WORLDLINE_ACCOUNT_ID." }, { status: 500 });
    }

    const db = getAdminDb();

    // Resolve amount
    let cents: number | null = null;
    if (typeof amountCents === "number") cents = amountCents;
    else if (productId) {
      const prod = await db.collection("products").doc(String(productId)).get();
      const data = prod.exists ? (prod.data() as any) : null;
      if (!data || !data.active || typeof data.priceCents !== "number") {
        return NextResponse.json({ ok:false, error: "Product not found/active or missing priceCents", productId }, { status: 400 });
      }
      cents = data.priceCents;
    } else {
      return NextResponse.json({ ok:false, error: "Missing amountCents or productId" }, { status: 400 });
    }

    // Ensure booking
    let bid = typeof bookingId === "string" && bookingId ? bookingId : undefined;
    if (!bid) {
      const ref = await db.collection("bookings").add({
        status: "pending",
        createdAt: new Date().toISOString(),
        productId: productId || null,
        amountCents: cents,
        region: region || null,
        date: date || null,
        slot: slot || null,
        name: name || null,
        email: email || null,
      });
      bid = ref.id;
    } else {
      await db.collection("bookings").doc(bid).set({
        status: "pending",
        updatedAt: new Date().toISOString(),
        productId: productId || null,
        amountCents: cents,
        region: region || null,
        date: date || null,
        slot: slot || null,
        name: name || null,
        email: email || null,
      }, { merge: true });
    }

    const { host, envMode } = envHost();
    const endpoint = `${host}/api/webpayments/paymentservice/rest/WPRequest`;

    // Whitelist-safe payload
    const form = new URLSearchParams({
      username: creds.username,
      password: creds.password,
      account_id: creds.account_id,
      cmd: "_xclick",
      type: "purchase",
      amount: ((cents as number) / 100).toFixed(2),
      reference: trim50(`BID:${bid}`),
      particular: trim50(`BID:${bid}`),
      return_url: ensureReturnUrl(returnUrl, bid as string, new URL(req.url).origin),
    });
    if (email) form.set("email", String(email));

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/xml, text/xml, */*" },
      body: form.toString(),
    });

    const raw = await res.text();
    if (!res.ok) {
      return NextResponse.json({ ok:false, status: res.status, endpoint, raw: raw.slice(0, 4000) }, { status: 502 });
    }

    // Extract redirect URL (accept :443)
    const urls = Array.from(raw.matchAll(/\bhttps?:\/\/[^\s<>"']+/gi)).map(m => m[0]);
    const paymark = urls.find(u => /paymarkclick\.co\.nz(?::443)?\/webpayments\/default\.aspx\?q=/i.test(u)) || null;
    const redirectUrl = paymark || urls.find(u => /paymarkclick\.co\.nz/i.test(u)) || null;
    if (!redirectUrl) {
      return NextResponse.json({ ok:false, status: res.status, endpoint, raw: raw.slice(0, 4000) }, { status: 502 });
    }

    // Store diagnostics
    await db.collection("bookings").doc(bid as string).set({
      worldline: {
        ...( (await db.collection("bookings").doc(bid as string).get()).data()?.worldline || {}),
        create: {
          at: new Date().toISOString(),
          endpoint,
          envMode,
          redirectUrl,
        }
      }
    }, { merge: true });

    return NextResponse.json({ ok:true, bookingId: bid, redirectUrl, endpoint, envMode });
  } catch (err: any) {
    return NextResponse.json({ ok:false, error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
