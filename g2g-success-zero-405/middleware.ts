// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Force /success to render with GET regardless of incoming method.
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
