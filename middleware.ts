// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Belt-and-braces: if a POST (or any non-GET) hits /success, force a 303 to GET.
 * Works regardless of app/page router and catches edge cases.
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
