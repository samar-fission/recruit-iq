import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = new Set(["/login", "/signup", "/api/auth/login", "/api/auth/signup", "/api/auth/logout", "/api/auth/me"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.startsWith("/assets")) {
    return NextResponse.next();
  }

  const token = req.cookies.get("auth")?.value;

  // For public pages, allow, but if already authenticated and visiting login/signup, redirect to /jobs
  if (PUBLIC_PATHS.has(pathname)) {
    if ((pathname === "/login" || pathname === "/signup") && token) {
      const url = new URL("/jobs", req.url);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Protected routes: require auth
  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/(.*)"],
};


