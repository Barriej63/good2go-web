export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

function normalizeEnv(v?: string) {
  const s = (v || '').toLowerCase().trim();
  if (['prod','production','live'].includes(s)) return 'prod';
  if (['uat','test','testing','sandbox','staging','dev','development'].includes(s)) return 'uat';
  return 'uat';
}
const mask = (t?: string) => !t ? "" : (t.length<=4 ? "*".repeat(t.length) : `${t.slice(0,2)}***${t.slice(-2)}`);

export async function GET() {
  const envIn = process.env.WORLDLINE_ENV || process.env.PAYMARK_ENV || 'uat';
  const env = normalizeEnv(envIn);
  const username = process.env.WORLDLINE_USERNAME || process.env.PAYMARK_CLIENT_ID || '';
  const accountId = process.env.WORLDLINE_ACCOUNT_ID || process.env.PAYMARK_ACCOUNT_ID || '';
  const endpoint = env === 'prod'
    ? 'https://secure.paymarkclick.co.nz/api/webpayments/paymentservice/rest/WPRequest'
    : 'https://uat.paymarkclick.co.nz/api/webpayments/paymentservice/rest/WPRequest';

  return NextResponse.json({
    ok: true,
    envIn, envNormalized: env, endpoint,
    username_masked: mask(username),
    password_present: Boolean(process.env.WORLDLINE_PASSWORD || process.env.PAYMARK_API_KEY),
    accountId_masked: mask(accountId),
    source: {
      username: process.env.WORLDLINE_USERNAME ? 'WORLDLINE_USERNAME' : (process.env.PAYMARK_CLIENT_ID ? 'PAYMARK_CLIENT_ID' : 'unset'),
      password: process.env.WORLDLINE_PASSWORD ? 'WORLDLINE_PASSWORD' : (process.env.PAYMARK_API_KEY ? 'PAYMARK_API_KEY' : 'unset'),
      accountId: process.env.WORLDLINE_ACCOUNT_ID ? 'WORLDLINE_ACCOUNT_ID' : (process.env.PAYMARK_ACCOUNT_ID ? 'PAYMARK_ACCOUNT_ID' : 'unset'),
      env: process.env.WORLDLINE_ENV ? 'WORLDLINE_ENV' : (process.env.PAYMARK_ENV ? 'PAYMARK_ENV' : 'default(uat)'),
    }
  });
}
