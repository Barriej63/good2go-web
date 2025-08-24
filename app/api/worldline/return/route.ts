import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  // You can read the tokenized results here if needed.
  return NextResponse.json({ ok:true, received:true, query: Object.fromEntries(url.searchParams.entries()) });
}

export async function POST(req: Request) {
  const body = await req.text();
  return new Response(body || 'ok', { status:200, headers: { 'Content-Type': 'text/plain' } });
}
