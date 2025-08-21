export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

function normalizeEnv(val?: string) {
  const s = (val || '').toLowerCase().trim();
  if (['prod','production','live'].includes(s)) return 'prod';
  if (['uat','test','testing','sandbox','staging','dev','development'].includes(s)) return 'uat';
  return 'uat';
}


function htmlUnescape(s: string) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractHppUrl(xml: string) {
  const urlRegex = /https?:\/\/[^\s<">]+/gi;
  const allRaw = xml.match(urlRegex) || [];
  const all = Array.from(new Set(allRaw.map(u => htmlUnescape(u.trim()))));

  // Filter out XML namespace / schema URLs
  const filtered = all.filter(u => !/schemas\.microsoft\.com|w3\.org\/2001\/XMLSchema/i.test(u));

  // Prefer Paymark Click domain
  const paymark = filtered.find(u => /paymarkclick\.co\.nz/i.test(u));
  if (paymark) return { chosen: paymark, urls: all };

  // Otherwise, prefer any https URL that isn't a schema
  if (filtered.length) return { chosen: filtered[0], urls: all };

  // Fallback: first seen
  return { chosen: all[0] || '', urls: all };
}


export async function GET(req: NextRequest) {
  const envIn = process.env.WORLDLINE_ENV || process.env.PAYMARK_ENV || 'uat';
  const env = normalizeEnv(envIn);
  const username = process.env.WORLDLINE_USERNAME || process.env.PAYMARK_CLIENT_ID || '';
  const password = process.env.WORLDLINE_PASSWORD || process.env.PAYMARK_API_KEY || '';
  const accountId = process.env.WORLDLINE_ACCOUNT_ID || process.env.PAYMARK_ACCOUNT_ID || '';
  const endpoint = env === "prod"
    ? "https://secure.paymarkclick.co.nz/api/webpayments/paymentservice/rest/WPRequest"
    : "https://uat.paymarkclick.co.nz/api/webpayments/paymentservice/rest/WPRequest";

  const form = new URLSearchParams();
  form.set("username", username);
  form.set("password", password);
  form.set("account_id", accountId);
  form.set("cmd", "_xclick");
  form.set("amount", "1.00");
  form.set("type", "purchase");
  form.set("reference", "G2G-TEST");
  form.set("particular", "BID:TEST");
  form.set("return_url", new URL("/api/worldline/return", req.url).toString());

  try {
    const res = await axios.post(endpoint, form.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/xml, text/xml, */*"
      },
      validateStatus: () => true,
      timeout: 120000,
    });
    const text: string = typeof res.data === "string" ? res.data : String(res.data);
    const { chosen, urls } = extractHppUrl(text);
    return NextResponse.json({ status: res.status, redirectUrl: chosen, urls, raw: text.slice(0, 1200), env });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Worldline request failed" }, { status: 500 });
  }
}
