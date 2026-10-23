import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  isAuthConfigured,
  verifySessionToken,
} from "@/lib/session";

function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/api/auth" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/_next/image") ||
    pathname === "/favicon.ico"
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const isApi = pathname === "/api" || pathname.startsWith("/api/");

  // Fail-closed : sans APP_PASSWORD ou SESSION_SECRET, rien ne passe.
  if (!isAuthConfigured()) {
    if (isApi) {
      return NextResponse.json(
        { error: "Authentification non configurée sur le serveur" },
        { status: 503 },
      );
    }
    return NextResponse.redirect(new URL("/login", request.url), 307);
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (await verifySessionToken(token)) {
    return NextResponse.next();
  }

  if (isApi) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url), 307);
}

export const config = {
  matcher: [
    /*
     * Toutes les pages et /api/* ; exclut les assets Next et le favicon.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
