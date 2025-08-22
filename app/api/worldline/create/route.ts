// app/api/worldline/create/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Worldline Click™ (Paymark) compatibility route.
 * Prefers /api/webpayments (used by many Woo plugins) and falls back to /api/transactions.
 * Env:
 *   WORLDLINE_ENV = production | prod | live | uat
 *   WORLDLINE_USERNAME = Client ID
 *   WORLDLINE_PASSWORD = API Key
 *   WORLDLINE_ACCOUNT_ID = Account ID
 * Optional:
 *   PUBLIC_RETURN_URL, PUBLIC_CANCEL_URL (fallbacks if not provided in body)
 */

type Attempt = { url: string; status: number; ok: boolean; raw: string; contentType?: string };

function envHost(): { host: string; envMode: string } {
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
  const noSchemas = httpish.filter(u => !/schemas\.microsoft\.com|w3\.org\/TR\/xhtml|w3\.org\/1999\/xhtml/i.test(u));
  const paymark = noSchemas.filter(u => /\bpaymarkclick\.co\.nz\b/i.test(u));
  const byHttps = (arr: string[]) => arr.sort((a,b)=> (b.startsWith("https://")?1:0) - (a.startsWith("https://")?1:0));
  const first = (arr: string[]) => arr.length ? byHttps(arr)[0] : null;
  return first(paymark) ?? first(noSchemas) ?? first(httpish);
}

function isHtmlError(body: string, contentType?: string): boolean {
  if (contentType && /text\/html/i.test(contentType)) return true;
  return /<!DOCTYPE html|<html/i.test(body);
}

function trimParticular(p: string): string {
  // Paymark particular max length 50 (we saw 5023 error earlier)
  if (p.length <= 50) return p;
  return p.slice(0, 50);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      amountCents,
      bookingId,
      particular,
      returnUrl,
      cancelUrl,
      customerEmail,
      worldlineExtra = {},
    } = body || {};

    const creds = {
      username: process.env.WORLDLINE_USERNAME || "",
      password: process.env.WORLDLINE_PASSWORD || "",
      accountid: process.env.WORLDLINE_ACCOUNT_ID || "",
    };
    if (!creds.username || !creds.password || !creds.accountid) {
      return NextResponse.json({ ok:false, error: "Missing Worldline env. Set WORLDLINE_USERNAME, WORLDLINE_PASSWORD, WORLDLINE_ACCOUNT_ID." }, { status: 500 });
    }
    if (!amountCents || !bookingId) {
      return NextResponse.json({ ok:false, error: "Missing amountCents or bookingId" }, { status: 400 });
    }

    const { host, envMode } = envHost();
    const form = new URLSearchParams({
      username: creds.username,
      password: creds.password,
      accountid: creds.accountid,
      amount: (amountCents / 100).toFixed(2),
      particular: trimParticular(particular || `BID:${bookingId}`),
      ...(returnUrl ? { returnurl: returnUrl } : (process.env.PUBLIC_RETURN_URL ? { returnurl: process.env.PUBLIC_RETURN_URL } : {})),
      ...(cancelUrl ? { cancelurl: cancelUrl } : (process.env.PUBLIC_CANCEL_URL ? { cancelurl: process.env.PUBLIC_CANCEL_URL } : {})),
      ...(customerEmail ? { email: String(customerEmail) } : {}),
      ...Object.fromEntries(Object.entries(worldlineExtra).map(([k,v]) => [k, String(v)])),
    });

    const paths = [
      "/api/webpayments",
      "/api/WebPayments",
      "/webpayments",
      "/webpayments/",
      "/api/transactions",
      "/api/transactions/",
      "/api/transaction",
      "/api/Transaction",
      "/api/Transactions",
      "/transactions",
      "/transactions/",
    ];

    const attempts: Attempt[] = [];
    let redirectUrl: string | null = null;
    let endpointUsed: string | null = null;

    for (const path of paths) {
      const url = `${host}${path}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/xml, text/xml, */*",
        },
        body: form.toString(),
      }).catch((e) => ({ ok:false, status:0, text: async ()=> String(e.message || "fetch failed"), headers: new Headers() } as any));

      const raw = await res.text();
      const contentType = res.headers?.get?.("content-type") || undefined;

      attempts.push({ url, status: (res as any).status ?? 0, ok: !!(res as any).ok, raw: raw.slice(0, 1200), contentType });

      if (!(res as any).ok || isHtmlError(raw, contentType)) continue;

      const urls = extractUrlsFromXml(raw);
      const picked = pickHppUrl(urls);
      if (picked) {
        redirectUrl = picked;
        endpointUsed = url;
        break;
      }
    }

    if (!redirectUrl) {
      return NextResponse.json({ ok:false, error: "No working Click endpoint produced an HPP URL.", envMode, attempts }, { status: 502 });
    }

    return NextResponse.json({ ok:true, redirectUrl, endpoint: endpointUsed, envMode });
  } catch (err: any) {
    return NextResponse.json({ ok:false, error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
