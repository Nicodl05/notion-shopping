import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Exclude public assets, static files, and API routes
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes("favicon.ico")
  ) {
    return NextResponse.next();
  }

  // 2. Allow access to /login
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // 3. Check for the auth_token cookie
  const authToken = request.cookies.get("auth_token")?.value;
  const appPassword = process.env.APP_PASSWORD;

  // During development or if not set on Vercel yet, we skip if no password configured
  if (!appPassword) {
    return NextResponse.next();
  }

  // 4. Validate the token
  if (authToken !== appPassword) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
