// app/success/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Guard for /success: any non-GET method will be converted to a GET via 303.
 * This prevents "HTTP 405" if a gateway posts back to /success directly.
 */

function redirect303(req: NextRequest) {
  const url = new URL(req.url);
  return NextResponse.redirect(url, 303);
}

export async function POST(req: NextRequest) { return redirect303(req); }
export async function PUT(req: NextRequest) { return redirect303(req); }
export async function PATCH(req: NextRequest) { return redirect303(req); }
export async function DELETE(req: NextRequest) { return redirect303(req); }
export async function HEAD(_req: NextRequest) { return NextResponse.json({}, { status: 200 }); }
export async function OPTIONS(_req: NextRequest) { return NextResponse.json({}, { status: 200 }); }
