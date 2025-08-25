// app/api/debug/echo/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  return NextResponse.json({
    ok: true,
    method: 'GET',
    query: Object.fromEntries(url.searchParams.entries()),
    headers: {
      host: req.headers.get('host'),
      referer: req.headers.get('referer'),
      'user-agent': req.headers.get('user-agent'),
    }
  });
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const bodyText = await req.text();
  return NextResponse.json({
    ok: true,
    method: 'POST',
    query: Object.fromEntries(url.searchParams.entries()),
    body: bodyText,
    headers: {
      host: req.headers.get('host'),
      'content-type': req.headers.get('content-type'),
      referer: req.headers.get('referer'),
      'user-agent': req.headers.get('user-agent'),
    }
  });
}
