// app/api/admin/config/slots/route.ts
import { NextResponse } from 'next/server';
import { isAdminCookie, getAdminRole, requireSuperadmin } from '@/lib/adminAuth';

const INTERNAL = '/api/admin/slots'; // we will call our internal handler

async function forward(method: 'POST'|'PATCH'|'DELETE', body: any, searchParams?: string) {
  const url = `${INTERNAL}${searchParams ? `?${searchParams}` : ''}`;
  const r = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      // Inject server-side secret header so the internal handler authorizes us
      'x-admin-token': process.env.ADMIN_TOKEN || '',
    },
    body: method === 'DELETE' ? undefined : JSON.stringify(body || {}),
    // ensure this never hits a cache
    cache: 'no-store',
  });
  const j = await r.json().catch(() => ({}));
  return NextResponse.json(j, { status: r.status });
}

export async function POST(req: Request) {
  // add slot
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok:false, error:'unauthorized' }, { status: 401 });
  const role = await getAdminRole();
  if (!requireSuperadmin(role)) return NextResponse.json({ ok:false, error:'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  return forward('POST', body);
}

export async function PATCH(req: Request) {
  // update venue/note (expects { region, index, venueAddress?, note? })
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok:false, error:'unauthorized' }, { status: 401 });
  const role = await getAdminRole();
  if (!requireSuperadmin(role)) return NextResponse.json({ ok:false, error:'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  return forward('PATCH', body);
}

export async function DELETE(req: Request) {
  // delete slot (expects ?region=...&index=...)
  const ok = await isAdminCookie();
  if (!ok) return NextResponse.json({ ok:false, error:'unauthorized' }, { status: 401 });
  const role = await getAdminRole();
  if (!requireSuperadmin(role)) return NextResponse.json({ ok:false, error:'forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  // pass through the query string as-is
  return forward('DELETE', null, searchParams.toString());
}
