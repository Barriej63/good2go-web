// app/api/worldline/test/route.ts
import { NextRequest, NextResponse } from "next/server";

type Attempt = { host: string; path: string; url: string; status: number; ok: boolean; contentType?: string; redirectUrl?: string | null; rawPreview: string };

const HOSTS = [
  { label: "production", base: "https://secure.paymarkclick.co.nz" },
  { label: "uat", base: "https://secure.uat.paymarkclick.co.nz" },
];
const PATHS = ["/api/transactions", "/api/transaction", "/api/Transactions"];

function extractUrl(xml: string): string | null {
  const all = Array.from(xml.matchAll(/\bhttps?:\/\/[^\s<>"']+/gi)).map(m => m[0]);
  const filtered = all.filter(u => /paymarkclick\.co\.nz/i.test(u) && !/w3\.org|schemas\.microsoft\.com/i.test(u));
  return filtered.find(u => u.startsWith("https://")) || filtered[0] || null;
}

async function tryPost(url: string, form: URLSearchParams) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/xml, text/xml, */*" },
    body: form.toString(),
  }).catch((e) => ({
    ok: false, status: 0, headers: new Headers(), text: async () => String(e?.message || "fetch error"),
  } as any));
  const raw = await res.text();
  const ct = res.headers.get("content-type") || "";
  const redirectUrl = /xml|text\/xml/i.test(ct) ? extractUrl(raw) : null;
  return { status: (res as any).status ?? 0, ok: (res as any).ok ?? false, contentType: ct, redirectUrl, raw };
}

export async function GET(_req: NextRequest) {
  try {
    if ((process.env.WORLDLINE_TEST_ENABLED || "").toLowerCase() !== "true") {
      return NextResponse.json({ error: "Disabled. Set WORLDLINE_TEST_ENABLED=true temporarily." }, { status: 403 });
    }
    const USER = process.env.WORLDLINE_USERNAME || "";
    const PASS = process.env.WORLDLINE_PASSWORD || "";
    const ACCT = process.env.WORLDLINE_ACCOUNT_ID || "";
    if (!USER || !PASS || !ACCT) {
      return NextResponse.json({ error: "Missing Worldline env" }, { status: 500 });
    }

    const form = new URLSearchParams({
      username: USER, password: PASS, accountid: ACCT,
      amount: "1.00", particular: "TEST:matrix",
    });

    const attempts: Attempt[] = [];
    for (const host of HOSTS) {
      for (const path of PATHS) {
        const url = `${host.base}${path}`;
        const { status, ok, contentType, redirectUrl, raw } = await tryPost(url, form);
        attempts.push({ host: host.label, path, url, status, ok, contentType, redirectUrl, rawPreview: raw.slice(0, 350) });
        if (ok && redirectUrl) {
          return NextResponse.json({ ok: true, envGuess: host.label, endpoint: url, redirectUrl, attempts });
        }
      }
    }
    return NextResponse.json({ ok: false, message: "No working endpoint found. Likely env/credential mismatch or HPP not enabled.", attempts }, { status: 502 });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
