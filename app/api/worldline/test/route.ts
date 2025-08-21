// app/api/worldline/test/route.ts
import { NextRequest, NextResponse } from "next/server";

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

function extractUrls(xml: string): string[] {
  const urls = new Set<string>();
  for (const m of xml.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) urls.add(m[1]);
  for (const m of xml.matchAll(/\bhttps?:\/\/[^\s<>"']+/gi)) urls.add(m[0]);
  for (const m of xml.matchAll(/<(HostedPaymentPage|RedirectUrl|HostedPaymentPageLink)[^>]*>([^<]+)<\/\1>/gi)) {
    urls.add(m[2]);
  }
  return Array.from(urls).filter(u => /^https?:\/\//i.test(u) && !/schemas\.microsoft\.com|w3\.org\/TR\/xhtml1/i.test(u));
}

function pickHppUrl(urls: string[]): string | null {
  const candidates = urls.filter(u => /paymarkclick\.co\.nz/i.test(u));
  const byHttps = (arr: string[]) => arr.sort((a,b) => (b.startsWith("https://")?1:0) - (a.startsWith("https://")?1:0));
  const first = (arr: string[]) => arr.length ? byHttps(arr)[0] : null;
  return first(candidates) ?? first(urls);
}

export async function GET(_req: NextRequest) {
  try {
    const USERNAME = process.env.WORLDLINE_USERNAME || "";
    const PASSWORD = process.env.WORLDLINE_PASSWORD || "";
    const ACCOUNT  = process.env.WORLDLINE_ACCOUNT_ID || "";
    if (!USERNAME || !PASSWORD || !ACCOUNT) {
      return NextResponse.json({ ok:false, error: "Missing Worldline env vars." }, { status: 500 });
    }

    const { envMode, base } = getEndpointBase();
    const form = new URLSearchParams({
      username: USERNAME,
      password: PASSWORD,
      accountid: ACCOUNT,
      amount: "1.00",
      particular: "TEST:diagnostic",
    });

    const url = base + "transactions"; // locked to plural
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/xml, text/xml, */*" },
      body: form.toString(),
    });

    const raw = await res.text();
    const urls = extractUrls(raw);
    const redirectUrl = pickHppUrl(urls);

    return NextResponse.json({ ok: res.ok && !!redirectUrl, status: res.status, redirectUrl: redirectUrl || null, urls, raw: raw.slice(0, 1000), env: envMode, endpoint: url }, { status: res.ok ? 200 : 502 });
  } catch (err: any) {
    return NextResponse.json({ ok:false, error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
