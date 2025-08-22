// app/api/worldline/create/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Worldline Click™ (Paymark) — Hosted Payment Page via Web Payments WPRequest.
 * Docs: https://developer.paymark.co.nz/click/  (Web Payments → Hosted Payment Page)
 *
 * Endpoint:
 *   POST https://secure[.uat].paymarkclick.co.nz/api/webpayments/paymentservice/rest/WPRequest
 *
 * Required env:
 *   WORLDLINE_ENV = production | prod | live | uat
 *   WORLDLINE_USERNAME = Client ID
 *   WORLDLINE_PASSWORD = API Key
 *   WORLDLINE_ACCOUNT_ID = Account ID
 * Optional env:
 *   PUBLIC_RETURN_URL, PUBLIC_CANCEL_URL (fallbacks if not provided in request body)
 */

function envHost(): { base: string; mode: string } {
  const mode = (process.env.WORLDLINE_ENV || "uat").toLowerCase();
  const isProd = ["production","prod","live"].includes(mode);
  return { base: isProd ? "https://secure.paymarkclick.co.nz" : "https://secure.uat.paymarkclick.co.nz", mode: isProd ? "production" : "uat" };
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
  const noNoise = httpish.filter(u => !/schemas\.microsoft\.com|w3\.org\/TR\/xhtml|w3\.org\/1999\/xhtml/i.test(u));
  const paymark = noNoise.filter(u => /\bpaymarkclick\.co\.nz\b/i.test(u));
  const byHttps = (arr: string[]) => arr.sort((a,b)=> (b.startsWith("https://")?1:0) - (a.startsWith("https://")?1:0));
  const first = (arr: string[]) => arr.length ? byHttps(arr)[0] : null;
  return first(paymark) ?? first(noNoise) ?? first(httpish);
}

function trim(str: string, n: number) { return str.length <= n ? str : str.slice(0, n); }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      amountCents,
      bookingId,
      reference, // optional custom reference
      particular, // up to 100 (docs say 100; we keep 50 for safety)
      returnUrl,
      cancelUrl,
      customerEmail,
      storePaymentToken = 0, // 0 no store, 1 ask, 2 force ask
    } = body || {};

    const creds = {
      username: process.env.WORLDLINE_USERNAME || "",
      password: process.env.WORLDLINE_PASSWORD || "",
      account_id: process.env.WORLDLINE_ACCOUNT_ID || "",
    };
    if (!creds.username || !creds.password || !creds.account_id) {
      return NextResponse.json({ ok:false, error: "Missing Worldline env. Set WORLDLINE_USERNAME, WORLDLINE_PASSWORD, WORLDLINE_ACCOUNT_ID." }, { status: 500 });
    }
    if (!amountCents) {
      return NextResponse.json({ ok:false, error: "Missing amountCents" }, { status: 400 });
    }

    const { base, mode } = envHost();
    const endpoint = `${base}/api/webpayments/paymentservice/rest/WPRequest`;

    const amount = (amountCents / 100).toFixed(2);
    const ref = trim(reference || (bookingId ? `BID:${bookingId}` : `ORDER:${Date.now()}`), 50);
    const part = trim(particular || (bookingId ? `BID:${bookingId}` : "Booking"), 50);

    const form = new URLSearchParams({
      // auth
      username: creds.username,
      password: creds.password,
      account_id: creds.account_id,
      // command
      cmd: "_xclick",
      type: "purchase",
      amount,
      reference: ref,
      particular: part,
      ...(customerEmail ? { customer_email: String(customerEmail) } : {}),
      store_payment_token: String(storePaymentToken),
      button_label: storePaymentToken ? "PAY AND SAVE CARD" : "PAY NOW",
      // return URL (required)
      return_url: returnUrl || process.env.PUBLIC_RETURN_URL || "",
      ...(cancelUrl ? { cancel_url: cancelUrl } : (process.env.PUBLIC_CANCEL_URL ? { cancel_url: process.env.PUBLIC_CANCEL_URL } : {})),
    });

    if (!form.get("return_url")) {
      return NextResponse.json({ ok:false, error: "Missing returnUrl (or set PUBLIC_RETURN_URL env)" }, { status: 400 });
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/xml, text/xml, */*",
      },
      body: form.toString(),
    }).catch((e) => ({ ok:false, status:0, text: async ()=> String(e.message || "fetch failed"), headers: new Headers() } as any));

    const raw = await res.text();
    const contentType = res.headers?.get?.("content-type") || "";

    // We expect an XML <string> with the HPP URL. On errors, they also return XML with an error code.
    const urls = extractUrlsFromXml(raw);
    const redirectUrl = pickHppUrl(urls);

    if (!(res as any).ok || !redirectUrl) {
      return NextResponse.json({ ok:false, status: (res as any).status ?? 0, endpoint, contentType, urls, raw: raw.slice(0, 1200) }, { status: 502 });
    }

    return NextResponse.json({ ok:true, redirectUrl, endpoint, envMode: mode, urls });
  } catch (err: any) {
    return NextResponse.json({ ok:false, error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
