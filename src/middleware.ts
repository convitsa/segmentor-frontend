import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LANDING_ONLY_PATHS = new Set(["/", "/about", "/contact", "/docs", "/privacy", "/terms"]);
const APP_ONLY_PREFIXES = ["/auth", "/dashboard", "/admin", "/billing"];

function isAppOnlyPath(pathname: string): boolean {
  return APP_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.replace(/:\d+$/, "");
  const { pathname } = request.nextUrl;

  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;
  const landingDomain = process.env.NEXT_PUBLIC_LANDING_DOMAIN;

  if (!appDomain || !landingDomain) return NextResponse.next();

  const isAppDomain = host === appDomain;
  const isLandingDomain = host === landingDomain;

  if (!isAppDomain && !isLandingDomain) return NextResponse.next();

  if (isAppDomain) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard/projects", request.url));
    }
    if (LANDING_ONLY_PATHS.has(pathname)) {
      return NextResponse.redirect(new URL(`https://${landingDomain}${pathname}`));
    }
  }

  if (isLandingDomain) {
    if (isAppOnlyPath(pathname)) {
      return NextResponse.redirect(new URL(`https://${appDomain}${pathname}`));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/about",
    "/contact",
    "/docs",
    "/privacy",
    "/terms",
    "/billing",
    "/auth/:path*",
    "/dashboard/:path*",
    "/admin/:path*",
  ],
};
