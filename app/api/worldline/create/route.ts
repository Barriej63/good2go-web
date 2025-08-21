// app/api/worldline/create/route.ts
import { NextRequest, NextResponse } from "next/server";

type Attempt = { url: string; status: number; raw: string };

// --- Env helpers: accept "production" | "prod" | "live" for prod; default to UAT otherwise
function getWorldlineBase(): { envMode: string; hostBase: string } {
  const envMode = (process.env.WORLDLINE_ENV || "uat").toLowerCase();
  const isProd = ["production", "prod", "live"].includes(envMode);
  const hostBase = isProd
    ? "https://secure.paymarkclick.co.nz"
    : "https://secure.uat.paymarkclick.co.nz";
  return { envMode, hostBase };
}

// --- Helper: choose the correct Hosted Payment Page URL ---
function pickHostedPaymentUrl(candidateUrls: string[]): string | null {
  const httpish = candidateUrls.filter((u) => typeof u === "string" && /^https?:\/\//i.test(u));
  const noSchemas = httpish.filter((u) => !/schemas\.microsoft\.com/i.test(u) && !/w3\.org/i.test(u));
  const paymark = noSchemas.filter((u) => /\bpaymarkclick\.co\.nz\b/i.test(u));
  const byHttps = (arr: string[]) =>
    arr.sort((a, b) => (b.startsWith("https://") ? 1 : 0) - (a.startsWith("https://") ? 1 : 0));
  const first = (arr: string[]) => (arr.length ? byHttps(arr)[0] : null);
  return first(paymark) ?? first(noSchemas) ?? first(httpish);
}

// --- Helper: extract all URLs from XML/text robustly ---
function extractUrlsFromXml(xml: string): string[] {
  const safe = typeof xml === "string" ? xml : "";
  const urls = new Set<string>();
  for (const m of safe.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) urls.add(m[1]);
  for (const m of safe.matchAll(/\bhttps?:\/\/[^\s<>"']+/gi)) urls.add(m[0]);
  for (const m of safe.matchAll(/<(HostedPaymentPage|RedirectUrl|HostedPaymentPageLink)[^>]*>([^<]+)<\/\1>/gi)) {
    urls.add(m[2]);
  }
  return Array.from(urls);
}

// Try both /api/transactions and /api/transaction (some tenants differ)
async function requestHppCreate(createBody: URLSearchParams, hostBase: string): Promise<{ ok: boolean; attempt: Attempt; attempts: Attempt[] }> {
  const paths = ["/api/transactions", "/api/transaction"];
  const attempts: Attempt[] = [];
  for (const path of paths) {
    const url = `${hostBase}${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/xml, text/xml, */*",
      },
      body: createBody.toString(),
    });
    const raw = await res.text().catch(() => "");
    attempts.push({ url, status: res.status, raw: typeof raw === "string" ? raw : "" });
    // treat 200 as success, and also accept 201 just in case
    if (res.ok) {
      return { ok: true, attempt: attempts[attempts.length - 1], attempts };
    }
    // if HTML error page detected, keep trying next path
    if (/<html/i.test(raw) || /<!DOCTYPE/i.test(raw)) continue;
  }
  return { ok: false, attempt: attempts[attempts.length - 1] || { url: `${hostBase}/api/transactions`, status: 0, raw: "" }, attempts };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { amountCents, bookingId, particular, returnUrl, cancelUrl, worldlineExtra = {} } = body || {};

    const env = {
      WORLDLINE_USERNAME: process.env.WORLDLINE_USERNAME || "",
      WORLDLINE_PASSWORD: process.env.WORLDLINE_PASSWORD || "",
      WORLDLINE_ACCOUNT_ID: process.env.WORLDLINE_ACCOUNT_ID || "",
    };

    if (!env.WORLDLINE_USERNAME || !env.WORLDLINE_PASSWORD || !env.WORLDLINE_ACCOUNT_ID) {
      return NextResponse.json(
        { error: "Missing Worldline env. Please set WORLDLINE_USERNAME, WORLDLINE_PASSWORD, WORLDLINE_ACCOUNT_ID." },
        { status: 500 }
      );
    }
    if (!amountCents || !bookingId) {
      return NextResponse.json({ error: "Missing amountCents or bookingId" }, { status: 400 });
    }

    const { envMode, hostBase } = getWorldlineBase();

    const form = new URLSearchParams({
      username: env.WORLDLINE_USERNAME,
      password: env.WORLDLINE_PASSWORD,
      accountid: env.WORLDLINE_ACCOUNT_ID,
      amount: (amountCents / 100).toFixed(2),
      particular: particular || `BID:${bookingId}`,
      ...(returnUrl ? { returnurl: returnUrl } : {}),
      ...(cancelUrl ? { cancelurl: cancelUrl } : {}),
      ...Object.fromEntries(Object.entries(worldlineExtra).map(([k, v]) => [k, String(v)])),
    });

    const { ok, attempt, attempts } = await requestHppCreate(form, hostBase);

    const raw = attempt?.raw ?? "";
    const urls = extractUrlsFromXml(raw);
    const redirectUrl = pickHostedPaymentUrl(urls);

    if (!ok || !redirectUrl) {
      return NextResponse.json(
        { error: "Could not find Hosted Payment Page URL in response", tried: attempts.map(a => ({ url: a.url, status: a.status })), urls, raw: raw.slice(0, 4000) },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, redirectUrl, urls, meta: { envMode, endpoint: attempt.url } });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
