// app/api/worldline/test/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Matrix tester: probes both hosts (prod + uat) across a broad set of Click (Paymark) endpoints.
 * Returns the first real HPP URL found, or a detailed attempts log.
 * Guarding is optional here; you can add your own header checks if needed.
 */

type Attempt = { host: "production" | "uat"; path: string; url: string; status: number; ok: boolean; contentType?: string; redirectUrl: string | null; rawPreview: string };

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

export async function GET(_req: NextRequest) {
  try {
    const creds = {
      username: process.env.WORLDLINE_USERNAME || "",
      password: process.env.WORLDLINE_PASSWORD || "",
      accountid: process.env.WORLDLINE_ACCOUNT_ID || "",
    };
    if (!creds.username || !creds.password || !creds.accountid) {
      return NextResponse.json({ ok:false, message: "Missing Worldline env. Set WORLDLINE_USERNAME, WORLDLINE_PASSWORD, WORLDLINE_ACCOUNT_ID." }, { status: 500 });
    }

    const hosts: { name: "production" | "uat"; base: string }[] = [
      { name: "production", base: "https://secure.paymarkclick.co.nz" },
      { name: "uat", base: "https://secure.uat.paymarkclick.co.nz" },
    ];
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

    const form = new URLSearchParams({
      username: creds.username,
      password: creds.password,
      accountid: creds.accountid,
      amount: "1.00",
      particular: "TEST:diagnostic",
    });

    const attempts: Attempt[] = [];
    let foundUrl: string | null = null;
    let endpoint: string | null = null;

    for (const host of hosts) {
      for (const path of paths) {
        const url = `${host.base}${path}`;
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
        let redirectUrl: string | null = null;

        if ((res as any).ok && !isHtmlError(raw, contentType)) {
          const urls = extractUrlsFromXml(raw);
          redirectUrl = pickHppUrl(urls);
          if (redirectUrl) {
            foundUrl = redirectUrl;
            endpoint = url;
          }
        }

        attempts.push({
          host: host.name,
          path,
          url,
          status: (res as any).status ?? 0,
          ok: !!(res as any).ok,
          contentType,
          redirectUrl,
          rawPreview: raw.slice(0, 600),
        });

        if (foundUrl) break;
      }
      if (foundUrl) break;
    }

    if (!foundUrl) {
      return NextResponse.json({ ok:false, message:"No working Click webpayments or transactions endpoint found.", attempts }, { status: 502 });
    }

    return NextResponse.json({ ok:true, endpoint, redirectUrl: foundUrl, attempts });
  } catch (err: any) {
    return NextResponse.json({ ok:false, message: err?.message || "Unexpected error" }, { status: 500 });
  }
}
