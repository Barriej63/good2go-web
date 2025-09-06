// app/api/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true, where: 'app/api/health', ts: Date.now() });
}
