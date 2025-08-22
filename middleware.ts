// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Safety net for /success: if any non-GET hits it, force a 303 redirect to the same URL.
 * This ensures your success page (GET) renders even if a gateway POSTs here directly.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if ((pathname === "/success" || pathname === "/success/") && req.method !== "GET") {
    const url = new URL(pathname + search, req.url);
    return NextResponse.redirect(url, 303);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/success", "/success/"],
};
