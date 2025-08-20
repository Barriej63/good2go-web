import { NextResponse } from "next/server";

export function middleware(req) {
  const USER = process.env.STAGING_USERNAME;
  const PASS = process.env.STAGING_PASSWORD;
  if (!USER || !PASS) return NextResponse.next();

  const auth = req.headers.get("authorization") || "";
  const [scheme, b64] = auth.split(" ");
  if (scheme === "Basic" && b64) {
    const [u, p] = atob(b64).split(":");
    if (u === USER && p === PASS) return NextResponse.next();
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Staging"' },
  });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
