import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    // Client-side auth check happens in the layout; 
    // middleware can only check cookie-based tokens.
    // Since we use localStorage JWT, the AuthGuard component handles redirects.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
