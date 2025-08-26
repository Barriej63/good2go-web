// app/api/worldline/create-shim/route.ts
// Thin wrapper to ensure MerchantReference = bookingId for all future sessions
// without touching your booking page logic.
// It forwards the payload to your existing creator (WORLDLINE_CREATE_URL) and
// returns whatever that endpoint returns.

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function asObject(bodyText: string, contentType: string | null) {
  try {
    if (contentType && contentType.includes('application/json')) {
      return JSON.parse(bodyText || '{}');
    }
  } catch {}
  // Fallback: parse x-www-form-urlencoded-style strings
  const out: Record<string,string> = {};
  for (const [k,v] of new URLSearchParams(bodyText).entries()) out[k] = v;
  return out;
}

function toBody(obj: any, originalType: string | null) {
  if (originalType && originalType.includes('application/json')) {
    return JSON.stringify(obj);
  }
  const usp = new URLSearchParams();
  Object.entries(obj || {}).forEach(([k,v]) => {
    if (v === undefined || v === null) return;
    usp.append(String(k), String(v));
  });
  return usp.toString();
}

export async function POST(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const bodyText = await req.text();
  const ct = req.headers.get('content-type');
  const input = asObject(bodyText, ct);

  // Extract bookingId from incoming payload (supports several common names)
  const bookingId = input.bookingId || input.bookingID || input.booking || input.id;
  if (bookingId) {
    // Ensure MerchantReference is always the bookingId
    input.MerchantReference = bookingId;
    // Also echo "Reference" for downstreams that expect it under that name
    input.Reference = input.Reference || bookingId;
  }

  // Decide where to forward: default to existing /api/worldline/create in the same app
  const forwardUrl = process.env.WORLDLINE_CREATE_URL
    || `https://${host}/api/worldline/create`;

  // Forward along original headers where safe; always set content-type
  const headers: Record<string,string> = { 'content-type': ct || 'application/json' };
  const auth = req.headers.get('authorization');
  if (auth) headers['authorization'] = auth;

  const res = await fetch(forwardUrl, {
    method: 'POST',
    headers,
    body: toBody(input, ct),
  });

  // Pass through status and body
  const text = await res.text();
  // If JSON, echo JSON; else wrap as text
  try {
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed, { status: res.status });
  } catch {
    return new NextResponse(text, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') || 'text/plain' },
    });
  }
}

export async function GET(req: NextRequest) {
  // Convenience GET for quick testing in browser:
  // /api/worldline/create-shim?bookingId=<id>&amount=65.00&...
  const host = req.headers.get('host') || '';
  const url = new URL(req.url);
  const input: Record<string,string> = {};
  for (const [k,v] of url.searchParams.entries()) input[k] = v;

  const bookingId = input.bookingId || input.bookingID || input.booking || input.id;
  if (bookingId) {
    input.MerchantReference = bookingId;
    input.Reference = input.Reference || bookingId;
  }

  const forwardUrl = process.env.WORLDLINE_CREATE_URL
    || `https://${host}/api/worldline/create`;

  const res = await fetch(forwardUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });

  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed, { status: res.status });
  } catch {
    return new NextResponse(text, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') || 'text/plain' },
    });
  }
}
