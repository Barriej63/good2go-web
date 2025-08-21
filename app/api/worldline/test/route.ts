// app/api/worldline/test/route.ts
import { NextRequest, NextResponse } from "next/server";

function getWorldlineBase(): { envMode: string; endpointBase: string; testEnabled: boolean } {
  const envMode = (process.env.WORLDLINE_ENV || "uat").toLowerCase();
  const isProd = ["production", "prod", "live"].includes(envMode);
  const endpointBase = isProd
    ? "https://secure.paymarkclick.co.nz/api/"
    : "https://secure.uat.paymarkclick.co.nz/api/";
  const testEnabled = (process.env.WORLDLINE_TEST_ENABLED || "").toLowerCase() === "true";
  return { envMode, endpointBase, testEnabled };
}

function pickHostedPaymentUrl(candidateUrls: string[]): string | null {
  const httpish = candidateUrls.filter(u => /^https?:\/\//i.test(u));
  const noSchemas = httpish.filter(u => !/schemas\.microsoft\.com/i.test(u));
  const paymark = noSchemas.filter(u => /\bpaymarkclick\.co\.nz\b/i.test(u));
  const byHttps = (arr: string[]) => arr.sort((a,b) => (b.startsWith("https://")?1:0) - (a.startsWith("https://")?1:0));
  const first = (arr: string[]) => arr.length ? byHttps(arr)[0] : null;
  return first(paymark) ?? first(noSchemas) ?? first(httpish);
}

function extractUrlsFromXml(xml: string): string[] {
  const urls = new Set<string>();
  for (const m of xml.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) urls.add(m[1]);
  for (const m of xml.matchAll(/\bhttps?:\/\/[^\s<>"']+/gi)) urls.add(m[0]);
  for (const m of xml.matchAll(/<(HostedPaymentPage|RedirectUrl|HostedPaymentPageLink)[^>]*>([^<]+)<\/\1>/gi)) {
    urls.add(m[2]);
  }
  return Array.from(urls);
}

export async function GET(req: NextRequest) {
  try {
    const { envMode, endpointBase, testEnabled } = getWorldlineBase();
    if (!testEnabled) {
      return NextResponse.json({ error: "Worldline test route is disabled. Set WORLDLINE_TEST_ENABLED=true to enable temporarily.", envMode }, { status: 403 });
    }

    const env = {
      WORLDLINE_USERNAME: process.env.WORLDLINE_USERNAME || "",
      WORLDLINE_PASSWORD: process.env.WORLDLINE_PASSWORD || "",
      WORLDLINE_ACCOUNT_ID: process.env.WORLDLINE_ACCOUNT_ID || "",
    };
    if (!env.WORLDLINE_USERNAME || !env.WORLDLINE_PASSWORD || !env.WORLDLINE_ACCOUNT_ID) {
      return NextResponse.json({ error: "Missing Worldline env" }, { status: 500 });
    }

    // Minimal $1.00 diagnostic transaction (not captured until user proceeds on HPP)
    const form = new URLSearchParams({
      username: env.WORLDLINE_USERNAME,
      password: env.WORLDLINE_PASSWORD,
      accountid: env.WORLDLINE_ACCOUNT_ID,
      amount: "1.00",
      particular: "TEST:diagnostic",
    });

    const createUrl = `${endpointBase}transactions`;
    const res = await fetch(createUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/xml, text/xml, */*" },
      body: form.toString(),
    });

    const raw = await res.text();
    const urls = extractUrlsFromXml(raw);
    const redirectUrl = pickHostedPaymentUrl(urls);

    return NextResponse.json(
      { status: res.status, redirectUrl, urls, raw: raw.slice(0, 4000), env: envMode },
      { status: res.ok ? 200 : 502 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
