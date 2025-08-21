// app/api/worldline/create/route.ts
import { NextRequest, NextResponse } from "next/server";

function getWorldlineBase(): { envMode: string; endpointHost: string } {
  const envMode = (process.env.WORLDLINE_ENV || "uat").toLowerCase();
  const isProd = ["production", "prod", "live"].includes(envMode);
  const endpointHost = isProd
    ? "https://secure.paymarkclick.co.nz/api/"
    : "https://secure.uat.paymarkclick.co.nz/api/";
  return { envMode, endpointHost };
}

function pickHostedPaymentUrl(candidateUrls: string[]): string | null {
  const httpish = candidateUrls.filter(u => /^https?:\/\//i.test(u));
  const noSchemas = httpish.filter(u => !/schemas\.microsoft\.com/i.test(u) && !/w3\.org/i.test(u));
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

function looksLikeHtml(s: string) {
  const head = s.slice(0, 200).toLowerCase();
  return head.includes("<!doctype html") || head.includes("<html") || head.includes("<!doctype xhtml");
}

async function tryCreate(endpointHost: string, formBody: string) {
  const paths = ["transactions", "transaction"]; // try plural then singular
  const attempts: any[] = [];
  for (const p of paths) {
    const url = `${endpointHost}${p}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/xml, text/xml, */*" },
      body: formBody,
    });
    const raw = await res.text();
    attempts.push({ url, status: res.status, ok: res.ok, raw: raw.slice(0, 1200) });
    if (res.ok && !looksLikeHtml(raw)) {
      // likely XML success
      return { ok: true, urlTried: url, status: res.status, raw };
    }
  }
  return { ok: false, attempts };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { amountCents, bookingId, particular, returnUrl, cancelUrl, worldlineExtra = {} } = body || {};

    const creds = {
      username: process.env.WORLDLINE_USERNAME || "",
      password: process.env.WORLDLINE_PASSWORD || "",
      accountid: process.env.WORLDLINE_ACCOUNT_ID || "",
    };
    if (!creds.username || !creds.password || !creds.accountid) {
      return NextResponse.json({ error: "Missing Worldline env. Set WORLDLINE_USERNAME, WORLDLINE_PASSWORD, WORLDLINE_ACCOUNT_ID." }, { status: 500 });
    }
    if (!amountCents || !bookingId) {
      return NextResponse.json({ error: "Missing amountCents or bookingId" }, { status: 400 });
    }

    const { envMode, endpointHost } = getWorldlineBase();
    const form = new URLSearchParams({
      username: creds.username,
      password: creds.password,
      accountid: creds.accountid,
      amount: (amountCents / 100).toFixed(2),
      particular: particular || `BID:${bookingId}`,
      ...(returnUrl ? { returnurl: returnUrl } : {}),
      ...(cancelUrl ? { cancelurl: cancelUrl } : {}),
      ...Object.fromEntries(Object.entries(worldlineExtra).map(([k, v]) => [k, String(v)])),
    });

    const attempt = await tryCreate(endpointHost, form.toString());
    if (!attempt.ok) {
      return NextResponse.json({ error: "Worldline create failed (all endpoints tried)", envMode, attempts: attempt.attempts }, { status: 502 });
    }

    const urls = extractUrlsFromXml(attempt.raw);
    const redirectUrl = pickHostedPaymentUrl(urls);
    if (!redirectUrl) {
      return NextResponse.json({ error: "Could not find Hosted Payment Page URL in response", tried: attempt.urlTried, urls, raw: attempt.raw.slice(0, 4000) }, { status: 502 });
    }
    return NextResponse.json({ ok: true, redirectUrl, urls, meta: { envMode, endpoint: attempt.urlTried } });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
