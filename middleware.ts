import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const EXCLUDED_PATHS = ["/api/auth", "/api/licenses", "/api/whoami", "/api/webhooks/stripe"];

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (EXCLUDED_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const country = req.headers.get("x-vercel-ip-country") || "US";
  if (!req.cookies.get("country")) {
    res.cookies.set("country", country, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return res;
}

export const config = { matcher: "/:path*" };
