// app/success/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Guard for gateways that POST to /success. Converts POST to a GET redirect
 * so the page route (app/success/page.tsx) can render without 405s.
 */
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  return NextResponse.redirect(url, 303); // force GET on /success
}

// Optional niceties
export async function HEAD(_req: NextRequest) { return NextResponse.json({}, { status: 200 }); }
export async function OPTIONS(_req: NextRequest) { return NextResponse.json({}, { status: 200 }); }
