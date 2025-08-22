// app/success/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * If anything POSTs to /success, convert it to a GET with 303 so page.tsx can render.
 */
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  return NextResponse.redirect(url, 303);
}

export async function HEAD(_req: NextRequest) { return NextResponse.json({}, { status: 200 }); }
export async function OPTIONS(_req: NextRequest) { return NextResponse.json({}, { status: 200 }); }
