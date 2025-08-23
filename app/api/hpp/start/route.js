import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get('ref');
  if (!ref) return NextResponse.json({ error: 'missing ref' }, { status: 400 });

  // TODO: Replace this with real HPP init; for now use WORLDLINE_HPP_URL or /success
  const fallback = process.env.WORLDLINE_HPP_URL || `/success?ref=${encodeURIComponent(ref)}`;
  return NextResponse.redirect(fallback, { status: 302 });
}
