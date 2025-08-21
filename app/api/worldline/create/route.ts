// app/api/worldline/create/route.ts
import { NextRequest, NextResponse } from "next/server";

type Attempt = { url: string; status: number; ok: boolean; contentType?: string; raw: string };

function envInfo() {
  const mode = (process.env.WORLDLINE_ENV || "uat").toLowerCase();
  const isProd = ["production","prod","live"].includes(mode);
  return {
    mode,
    host: isProd ? "https://secure.paymarkclick.co.nz" : "https://secure.uat.paymarkclick.co.nz"
  };
}

function chooseUrlFromXml(xml: string): string | null {
  const candidates = new Set<string>();
  for (const m of xml.matchAll(/\bhttps?:\/\/[^\s<>"']+/gi)) candidates.add(m[0]);
  const arr = Array.from(candidates).filter(u => !/schemas\.microsoft\.com|w3\.org/i.test(u));
  const paymark = arr.filter(u => /paymarkclick\.co\.nz/i.test(u));
  return (paymark.find(u => u.startsWith("https://")) || paymark[0] || arr[0]) ?? null;
}

async function postForm(url: string, form: URLSearchParams): Promise<Attempt> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/xml, text/xml, */*" },
    body: form.toString(),
  }).catch((e) => ({
    ok: false,
    status: 0,
    headers: new Headers(),
    text: async () => String(e?.message || "fetch error"),
  } as any));
  const raw = await res.text();
  const ct = res.headers.get("content-type") || undefined;
  return { url, status: (res as any).status ?? 0, ok: (res as any).ok ?? false, contentType: ct, raw };
}

export async function POST(req: NextRequest) {
  try {
    const { host, mode } = envInfo();
    const body = await req.json().catch(() => ({}));
    const { amountCents, bookingId, particular, returnUrl, cancelUrl, worldlineExtra = {} } = body || {};

    const USER = process.env.WORLDLINE_USERNAME || "";
    const PASS = process.env.WORLDLINE_PASSWORD || "";
    const ACCT = process.env.WORLDLINE_ACCOUNT_ID || "";

    if (!USER || !PASS || !ACCT) {
      return NextResponse.json({ error: "Missing Worldline env (WORLDLINE_USERNAME, WORLDLINE_PASSWORD, WORLDLINE_ACCOUNT_ID)" }, { status: 500 });
    }
    if (!amountCents || !bookingId) return NextResponse.json({ error: "Missing amountCents or bookingId" }, { status: 400 });

    const form = new URLSearchParams({
      username: USER, password: PASS, accountid: ACCT,
      amount: (amountCents/100).toFixed(2), particular: particular || `BID:${bookingId}`,
      ...(returnUrl ? { returnurl: returnUrl } : {}),
      ...(cancelUrl ? { cancelurl: cancelUrl } : {}),
      ...Object.fromEntries(Object.entries(worldlineExtra).map(([k,v]) => [k, String(v)])),
    });

    const endpoints = [`${host}/api/transactions`, `${host}/api/transaction`, `${host}/api/Transactions`];
    const attempts: Attempt[] = [];
    for (const url of endpoints) {
      const attempt = await postForm(url, form);
      attempts.push(attempt);
      if (attempt.ok && /xml|text\/xml/i.test(attempt.contentType || "") && /https?:\/\/.*paymarkclick\.co\.nz/i.test(attempt.raw)) {
        const redirectUrl = chooseUrlFromXml(attempt.raw);
        if (redirectUrl) {
          return NextResponse.json({ ok: true, redirectUrl, endpoint: url, env: mode });
        }
      }
    }
    // If here, none matched. Return best clue.
    return NextResponse.json({ ok: false, error: "Could not create HPP", env: mode, endpointTried: endpoints, attempts }, { status: 502 });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
