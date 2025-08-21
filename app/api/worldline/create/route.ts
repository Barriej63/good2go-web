// app/api/worldline/create/route.ts
import { NextRequest, NextResponse } from "next/server";

// --- Env helpers: production vs uat ---
function getEndpointBase(): { envMode: string; base: string } {
  const envMode = (process.env.WORLDLINE_ENV || "uat").toLowerCase();
  const isProd = ["production", "prod", "live"].includes(envMode);
  return {
    envMode: isProd ? "production" : "uat",
    base: isProd
      ? "https://secure.paymarkclick.co.nz/api/"
      : "https://secure.uat.paymarkclick.co.nz/api/",
  };
}

// --- XML helpers ---
function extractUrls(xml: string): string[] {
  const urls = new Set<string>();
  // href="..."
  for (const m of xml.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) urls.add(m[1]);
  // absolute URLs in text
  for (const m of xml.matchAll(/\bhttps?:\/\/[^\s<>"']+/gi)) urls.add(m[0]);
  // known tags
  for (const m of xml.matchAll(/<(HostedPaymentPage|RedirectUrl|HostedPaymentPageLink)[^>]*>([^<]+)<\/\1>/gi)) {
    urls.add(m[2]);
  }
  // filter noise
  return Array.from(urls).filter(u => /^https?:\/\//i.test(u) && !/schemas\.microsoft\.com|w3\.org\/TR\/xhtml1/i.test(u));
}

function pickHppUrl(urls: string[]): string | null {
  const candidates = urls.filter(u => /paymarkclick\.co\.nz/i.test(u));
  const byHttps = (arr: string[]) => arr.sort((a,b) => (b.startsWith("https://")?1:0) - (a.startsWith("https://")?1:0));
  const first = (arr: string[]) => arr.length ? byHttps(arr)[0] : null;
  return first(candidates) ?? first(urls);
}

export async function POST(req: NextRequest) {
  try {
    const {
      amountCents,
      bookingId,
      particular,
      returnUrl,
      cancelUrl,
      worldlineExtra = {},
    } = await req.json();

    const USERNAME = process.env.WORLDLINE_USERNAME || "";
    const PASSWORD = process.env.WORLDLINE_PASSWORD || "";
    const ACCOUNT  = process.env.WORLDLINE_ACCOUNT_ID || "";
    if (!USERNAME || !PASSWORD || !ACCOUNT) {
      return NextResponse.json({ error: "Missing Worldline env vars." }, { status: 500 });
    }
    if (!amountCents || !bookingId) {
      return NextResponse.json({ error: "Missing amountCents or bookingId." }, { status: 400 });
    }

    const { envMode, base } = getEndpointBase();

    const form = new URLSearchParams({
      username: USERNAME,
      password: PASSWORD,
      accountid: ACCOUNT,
      amount: (amountCents / 100).toFixed(2),
      particular: particular || `BID:${bookingId}`,
      ...(returnUrl ? { returnurl: returnUrl } : {}),
      ...(cancelUrl ? { cancelurl: cancelUrl } : {}),
      ...Object.fromEntries(Object.entries(worldlineExtra).map(([k, v]) => [k, String(v)])),
    });

    const url = base + "transactions"; // **locked to plural; known good**
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/xml, text/xml, */*" },
      body: form.toString(),
    });

    const raw = await res.text();
    if (!res.ok) {
      return NextResponse.json({ ok: false, status: res.status, raw: raw.slice(0, 4000), endpoint: url }, { status: 502 });
    }

    const urls = extractUrls(raw);
    const redirectUrl = pickHppUrl(urls);

    if (!redirectUrl) {
      return NextResponse.json({ ok: false, error: "No Hosted Payment Page URL found", urls, raw: raw.slice(0, 4000), endpoint: url }, { status: 502 });
    }

    return NextResponse.json({ ok: true, status: res.status, redirectUrl, urls, env: envMode, endpoint: url });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
