// app/api/admin/config/slots/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { isAdminCookie } from '@/lib/adminAuth';

const UPSTREAM = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/slots`;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

async function forward(req: NextRequest, method: 'GET'|'POST'|'PATCH'|'DELETE') {
  if (!ADMIN_TOKEN) {
    return NextResponse.json({ ok: false, error: 'missing_ADMIN_TOKEN' }, { status: 500 });
  }

  const url = new URL(req.url);
  const q = url.search || '';
  const target = `${UPSTREAM}${q}`;

  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_TOKEN },
  };

  if (method === 'POST' || method === 'PATCH') {
    const body = await req.text(); // pass through raw body
    (init as any).body = body;
  }

  const r = await fetch(target, init);
  const text = await r.text();
  return new NextResponse(text, { status: r.status, headers: { 'Content-Type': 'application/json' } });
}

export async function POST(req: NextRequest) {
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  return forward(req, 'POST');
}

export async function PATCH(req: NextRequest) {
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  return forward(req, 'PATCH');
}

export async function DELETE(req: NextRequest) {
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  return forward(req, 'DELETE');
}
