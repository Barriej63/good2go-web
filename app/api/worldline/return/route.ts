
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function pickRefFrom(params: URLSearchParams): string | null {
  const keys = ['Reference', 'ref', 'merchantReference', 'reference', 'REF'];
  for (const k of keys) {
    const v = params.get(k);
    if (v && v.trim()) return v.trim();
  }
  return null;
}

async function extractParams(req: NextRequest): Promise<URLSearchParams> {
  const method = req.method.toUpperCase();
  if (method === 'GET') {
    return req.nextUrl.searchParams;
  }
  const ct = (req.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('application/x-www-form-urlencoded')) {
    const body = await req.text();
    return new URLSearchParams(body);
  }
  if (ct.includes('application/json')) {
    const data = await req.json().catch(() => ({} as any));
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(data || {})) {
      if (v !== undefined && v !== null) sp.set(k, String(v));
    }
    return sp;
  }
  const raw = await req.text().catch(() => '');
  return new URLSearchParams(raw);
}

export async function GET(req: NextRequest) {
  const params = await extractParams(req);
  const ref = pickRefFrom(params);
  if (!ref) {
    return NextResponse.json({ ok:false, error:'missing_reference', echo: Object.fromEntries(params) }, { status: 400 });
  }
  const target = new URL(`/success?ref=${encodeURIComponent(ref)}`, req.url);
  return NextResponse.redirect(target, { status: 302 });
}

export async function POST(req: NextRequest) {
  const params = await extractParams(req);
  const ref = pickRefFrom(params);
  if (!ref) {
    return NextResponse.json({ ok:false, error:'missing_reference', echo: Object.fromEntries(params) }, { status: 400 });
  }
  const target = new URL(`/success?ref=${encodeURIComponent(ref)}`, req.url);
  return NextResponse.redirect(target, { status: 302 });
}
