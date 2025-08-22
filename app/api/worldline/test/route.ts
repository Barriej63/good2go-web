// app/api/worldline/test/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Simple verifier for Web Payments HPP (WPRequest).
 * Posts a $1.00 test and returns the HPP URL if reachable.
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

export async function GET(_req: NextRequest) {
  try {
    const creds = {
      username: process.env.WORLDLINE_USERNAME || "",
      password: process.env.WORLDLINE_PASSWORD || "",
      account_id: process.env.WORLDLINE_ACCOUNT_ID || "",
    };
    if (!creds.username || !creds.password || !creds.account_id) {
      return NextResponse.json({ ok:false, error: "Missing WORLDLINE_USERNAME/PASSWORD/ACCOUNT_ID" }, { status: 500 });
    }

    const { base, mode } = envHost();
    const endpoint = `${base}/api/webpayments/paymentservice/rest/WPRequest`;

    const form = new URLSearchParams({
      username: creds.username,
      password: creds.password,
      account_id: creds.account_id,
      cmd: "_xclick",
      type: "purchase",
      amount: "1.00",
      reference: "TEST:diagnostic",
      particular: "TEST",
      store_payment_token: "0",
      button_label: "PAY NOW",
      return_url: process.env.PUBLIC_RETURN_URL || "https://example.com/return",
    });

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/xml, text/xml, */*",
      },
      body: form.toString(),
    }).catch((e) => ({ ok:false, status:0, text: async ()=> String(e.message || "fetch failed"), headers: new Headers() } as any));

    const raw = await res.text();
    const urls = extractUrlsFromXml(raw);
    const redirectUrl = pickHppUrl(urls);

    return NextResponse.json({
      ok: !!redirectUrl && (res as any).ok,
      status: (res as any).status ?? 0,
      endpoint,
      envMode: mode,
      redirectUrl: redirectUrl || null,
      urls,
      raw: raw.slice(0, 1200),
    }, { status: (res as any).ok ? 200 : 502 });
  } catch (err: any) {
    return NextResponse.json({ ok:false, error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
