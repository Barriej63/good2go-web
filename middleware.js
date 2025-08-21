import { NextResponse } from "next/server";

// Anything that should be accessible without the staging password
const PUBLIC_PREFIXES = [
  "/api/public",      // products & timeslots
  "/api/worldline",   // create + return
  "/api/health",      // healthcheck
  "/book",
  "/success",
  "/cancel",
  "/_next",           // Next.js assets
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
];

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // Skip auth for public paths
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const USER = process.env.STAGING_USERNAME;
  const PASS = process.env.STAGING_PASSWORD;
  if (!USER || !PASS) return NextResponse.next();

  const auth = req.headers.get("authorization") || "";
  const [scheme, b64] = auth.split(" ");
  if (scheme === "Basic" && b64) {
    const [u, p] = atob(b64).split(":"); // Edge runtime has atob()
    if (u === USER && p === PASS) return NextResponse.next();
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Staging"' },
  });
}

// Apply to everything that's not a static file
export const config = { matcher: ["/((?!.*\\.).*)"] };

