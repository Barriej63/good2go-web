// app/api/worldline/test/route.ts
import { NextRequest, NextResponse } from "next/server";

type Attempt = { url: string; status: number; raw: string };

function getWorldlineBase(): { envMode: string; hostBase: string; testEnabled: boolean } {
  const envMode = (process.env.WORLDLINE_ENV || "uat").toLowerCase();
  const isProd = ["production", "prod", "live"].includes(envMode);
  const hostBase = isProd
    ? "https://secure.paymarkclick.co.nz"
    : "https://secure.uat.paymarkclick.co.nz";
  const testEnabled = (process.env.WORLDLINE_TEST_ENABLED || "").toLowerCase() === "true";
  return { envMode, hostBase, testEnabled };
}

function pickHostedPaymentUrl(candidateUrls: string[]): string | null {
  const httpish = candidateUrls.filter((u) => typeof u === "string" && /^https?:\/\//i.test(u));
  const noSchemas = httpish.filter((u) => !/schemas\.microsoft\.com/i.test(u) && !/w3\.org/i.test(u));
  const paymark = noSchemas.filter((u) => /\bpaymarkclick\.co\.nz\b/i.test(u));
  const byHttps = (arr: string[]) =>
    arr.sort((a, b) => (b.startsWith("https://") ? 1 : 0) - (a.startsWith("https://") ? 1 : 0));
  const first = (arr: string[]) => (arr.length ? byHttps(arr)[0] : null);
  return first(paymark) ?? first(noSchemas) ?? first(httpish);
}

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

async function requestHppCreate(createBody: URLSearchParams, hostBase: string): Promise<{ ok: boolean; attempt: Attempt; attempts: Attempt[] }> {
  const paths = ["/api/transactions", "/api/transaction"];
  const attempts: Attempt[] = [];
  for (const path of paths) {
    const url = `${hostBase}${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/xml, text/xml, */*" },
      body: createBody.toString(),
    });
    const raw = await res.text().catch(() => "");
    attempts.push({ url, status: res.status, raw: typeof raw === "string" ? raw : "" });
    if (res.ok) {
      return { ok: true, attempt: attempts[attempts.length - 1], attempts };
    }
    if (/<html/i.test(raw) || /<!DOCTYPE/i.test(raw)) continue;
  }
  return { ok: false, attempt: attempts[attempts.length - 1] || { url: `${hostBase}/api/transactions`, status: 0, raw: "" }, attempts };
}

export async function GET(_req: NextRequest) {
  try {
    const { envMode, hostBase, testEnabled } = getWorldlineBase();
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

    const form = new URLSearchParams({
      username: env.WORLDLINE_USERNAME,
      password: env.WORLDLINE_PASSWORD,
      accountid: env.WORLDLINE_ACCOUNT_ID,
      amount: "1.00",
      particular: "TEST:diagnostic",
    });

    const { ok, attempt, attempts } = await requestHppCreate(form, hostBase);

    const raw = attempt?.raw ?? "";
    const urls = extractUrlsFromXml(raw);
    const redirectUrl = pickHostedPaymentUrl(urls);

    return NextResponse.json(
      { ok, status: attempts.at(-1)?.status ?? 0, redirectUrl, urls, raw: raw.slice(0, 4000), env: envMode, endpoint: attempt?.url ?? "", attempts: attempts.map(a => ({ url: a.url, status: a.status })) },
      { status: ok ? 200 : 502 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
