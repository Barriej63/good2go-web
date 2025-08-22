// app/api/worldline/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

/**
 * Worldline Click™ (Paymark) — WPRequest Create (enhanced)
 * Accepts either:
 *   A) { amountCents, bookingId, ... }  (original contract)
 *   B) { productId, region, date, slot, name, email }  (auto: look up amount, create bookingId)
 *
 * If bookingId is not provided, we will create a Firestore document in bookings/* with status "pending"
 * and use its auto-ID as bookingId. We also store the submitted fields in that doc.
 *
 * Env (set for ONE environment only):
 *  - WORLDLINE_ENV: production | prod | live | uat
 *  - WORLDLINE_USERNAME: <Client ID>
 *  - WORLDLINE_PASSWORD: <API Key>
 *  - WORLDLINE_ACCOUNT_ID: <Account ID>
 *  - PUBLIC_RETURN_URL / PUBLIC_CANCEL_URL (optional fallbacks)
 */

function envHost(): { host: string; envMode: "production"|"uat" } {
  const mode = (process.env.WORLDLINE_ENV || "uat").toLowerCase();
  const isProd = ["production","prod","live"].includes(mode);
  return { host: isProd ? "https://secure.paymarkclick.co.nz" : "https://secure.uat.paymarkclick.co.nz", envMode: isProd ? "production" : "uat" };
}

function extractUrlsFromXml(xml: string): string[] {
  const urls = new Set<string>();
  for (const m of xml.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) urls.add(m[1]);
  for (const m of xml.matchAll(/\bhttps?:\/\/[^\s<>"']+/gi)) urls.add(m[0]);
  for (const m of xml.matchAll(/<(HostedPaymentPage|RedirectUrl|HostedPaymentPageLink|string)[^>]*>([^<]+)<\/\1>/gi)) {
    urls.add(m[2]);
  }
  return Array.from(urls);
}

function pickHppUrl(urls: string[]): string | null {
  const httpish = urls.filter(u => /^https?:\/\//i.test(u));
  const dropNoise = httpish.filter(u => !/schemas\.microsoft\.com|w3\.org\/TR\/xhtml|w3\.org\/1999\/xhtml/i.test(u));
  const paymark = dropNoise.filter(u => /\bpaymarkclick\.co\.nz\b/i.test(u));
  const byHttps = (arr: string[]) => arr.sort((a,b)=> (b.startsWith("https://")?1:0) - (a.startsWith("https://")?1:0));
  const first = (arr: string[]) => arr.length ? byHttps(arr)[0] : null;
  return first(paymark) ?? first(dropNoise) ?? first(httpish);
}

function trim50(s: string) {
  return s.length <= 50 ? s : s.slice(0, 50);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let {
      amountCents,
      bookingId,
      // booking fields (if we need to create the booking server-side)
      productId,
      region,
      date,
      slot,
      name,
      email,
      // optional overrides
      returnUrl,
      cancelUrl,
      // advanced
      storePaymentToken,
      buttonLabel,
    } = (body || {}) as any;

    // 1) If amount not provided, allow productId lookup
    if ((!amountCents || isNaN(Number(amountCents))) && productId) {
      const db = getAdminDb();
      const prodRef = db.collection("products").doc(String(productId));
      const prodSnap = await prodRef.get();
      if (!prodSnap.exists) {
        return NextResponse.json({ ok:false, error: `Unknown productId: ${productId}` }, { status: 400 });
      }
      const prod = prodSnap.data() as any;
      if (prod.active === false) {
        return NextResponse.json({ ok:false, error: `Product ${productId} is not active` }, { status: 400 });
      }
      const price = Number(prod.priceCents ?? prod.pricecents ?? prod.price ?? 0);
      if (!price || isNaN(price)) {
        return NextResponse.json({ ok:false, error: `Product ${productId} missing priceCents` }, { status: 400 });
      }
      amountCents = price;
    }

    // 2) If no bookingId, create one and persist "pending" booking
    if (!bookingId) {
      const db = getAdminDb();
      const bookings = db.collection("bookings");
      const newDoc = bookings.doc(); // auto-id
      bookingId = newDoc.id;
      const now = new Date().toISOString();
      const bookingData = {
        productId: productId || null,
        region: region || null,
        date: date || null,
        slot: slot || null,
        name: name || null,
        email: email || null,
        amountCents: Number(amountCents) || null,
        status: "pending",
        createdAt: now,
      };
      await newDoc.set(bookingData, { merge: true });
    }

    // Validate we now have both
    if (!amountCents || !bookingId) {
      return NextResponse.json({ ok:false, error: "Missing amountCents or bookingId" }, { status: 400 });
    }

    // 3) Credentials and endpoint
    const creds = {
      username: process.env.WORLDLINE_USERNAME || "",
      password: process.env.WORLDLINE_PASSWORD || "",
      account_id: process.env.WORLDLINE_ACCOUNT_ID || "",
    };
    if (!creds.username || !creds.password || !creds.account_id) {
      return NextResponse.json({ ok:false, error: "Missing Worldline env. Set WORLDLINE_USERNAME, WORLDLINE_PASSWORD, WORLDLINE_ACCOUNT_ID." }, { status: 500 });
    }
    const { host, envMode } = envHost();
    const endpoint = `${host}/api/webpayments/paymentservice/rest/WPRequest`;

    // 4) Build WPRequest form
    const form = new URLSearchParams({
      username: creds.username,
      password: creds.password,
      account_id: creds.account_id,
      cmd: "_xclick",
      type: "purchase",
      amount: (Number(amountCents) / 100).toFixed(2),
      reference: trim50(`BID:${bookingId}`),
      particular: trim50(`BID:${bookingId}`),
      return_url: returnUrl || process.env.PUBLIC_RETURN_URL || "",
      cancel_url: cancelUrl || process.env.PUBLIC_CANCEL_URL || "",
    });
    if (email) form.set("email", String(email));
    if (buttonLabel) form.set("button_label", String(buttonLabel));
    if (storePaymentToken !== undefined && storePaymentToken !== null) {
      form.set("store_payment_token", String(storePaymentToken));
    }
    if (region) form.set("custom_region", String(region));
    if (date) form.set("custom_date", String(date));
    if (slot) form.set("custom_slot", String(slot));
    if (name) form.set("custom_name", String(name));
    if (bookingId) form.set("custom_booking_id", String(bookingId));

    // 5) Call gateway
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/xml, text/xml, */*",
      },
      body: form.toString(),
    });
    const raw = await res.text();
    if (!res.ok) {
      return NextResponse.json({ ok:false, status: res.status, endpoint, raw: raw.slice(0, 4000) }, { status: 502 });
    }

    const urls = extractUrlsFromXml(raw);
    const redirectUrl = pickHppUrl(urls);
    if (!redirectUrl) {
      return NextResponse.json({ ok:false, status: res.status, endpoint, urls, raw: raw.slice(0, 4000) }, { status: 502 });
    }

    return NextResponse.json({ ok:true, status: res.status, envMode, endpoint, bookingId, redirectUrl });
  } catch (err: any) {
    return NextResponse.json({ ok:false, error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
