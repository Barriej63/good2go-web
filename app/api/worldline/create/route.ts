// app/api/worldline/create/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Worldline Click™ (Paymark) — WPRequest Create
 * Posts to: /api/webpayments/paymentservice/rest/WPRequest
 * Returns a Hosted Payment Page URL for redirection.
 *
 * Env (set for ONE environment only):
 *  - WORLDLINE_ENV: production | prod | live | uat
 *  - WORLDLINE_USERNAME: <Client ID>
 *  - WORLDLINE_PASSWORD: <API Key>
 *  - WORLDLINE_ACCOUNT_ID: <Account ID>
 *  - PUBLIC_RETURN_URL: https://your-domain/success        (optional fallback)
 *  - PUBLIC_CANCEL_URL: https://your-domain/cancel         (optional fallback)
 */

type Attempt = { url: string; status: number; ok: boolean; raw: string; contentType?: string };

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
    const {
      amountCents,
      bookingId,
      region,
      date,
      slot,
      name,
      email,
      returnUrl,
      cancelUrl,
      // Optional advanced flags (pass-through to WPRequest if needed):
      storePaymentToken, // 0 | 1 | 2
      buttonLabel,       // custom button caption
    } = body || {};

    const creds = {
      username: process.env.WORLDLINE_USERNAME || "",
      password: process.env.WORLDLINE_PASSWORD || "",
      account_id: process.env.WORLDLINE_ACCOUNT_ID || "",
    };
    if (!creds.username || !creds.password || !creds.account_id) {
      return NextResponse.json({ ok:false, error: "Missing Worldline env. Set WORLDLINE_USERNAME, WORLDLINE_PASSWORD, WORLDLINE_ACCOUNT_ID." }, { status: 500 });
    }
    if (!amountCents || !bookingId) {
      return NextResponse.json({ ok:false, error: "Missing amountCents or bookingId" }, { status: 400 });
    }

    const { host, envMode } = envHost();
    const endpoint = `${host}/api/webpayments/paymentservice/rest/WPRequest`;

    // WPRequest expects some specific field names.
    const form = new URLSearchParams({
      username: creds.username,
      password: creds.password,
      account_id: creds.account_id,
      cmd: "_xclick",
      type: "purchase",
      amount: (amountCents / 100).toFixed(2),
      reference: trim50(`BID:${bookingId}`),
      particular: trim50(`BID:${bookingId}`),
      return_url: returnUrl || process.env.PUBLIC_RETURN_URL || "",
      cancel_url: cancelUrl || process.env.PUBLIC_CANCEL_URL || "",
    });

    if (email) form.set("email", String(email));
    if (buttonLabel) form.set("button_label", String(buttonLabel));
    if (storePaymentToken !== undefined && storePaymentToken !== null) {
      form.set("store_payment_token", String(storePaymentToken)); // 0/1/2
    }

    // Attach metadata fields for traceability (ignored by gateway if unknown)
    if (region) form.set("custom_region", String(region));
    if (date) form.set("custom_date", String(date));
    if (slot) form.set("custom_slot", String(slot));
    if (name) form.set("custom_name", String(name));
    if (bookingId) form.set("custom_booking_id", String(bookingId));

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

    return NextResponse.json({ ok:true, status: res.status, endpoint, envMode, redirectUrl, urls, raw: raw.slice(0, 4000) });
  } catch (err: any) {
    return NextResponse.json({ ok:false, error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
