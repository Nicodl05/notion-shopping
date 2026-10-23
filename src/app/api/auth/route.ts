import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isAuthConfigured,
  passwordMatches,
  sessionCookieOptions,
} from "@/lib/session";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  try {
    if (!isAuthConfigured()) {
      return NextResponse.json(
        { error: "Authentification non configurée sur le serveur" },
        { status: 503 },
      );
    }

    const password =
      typeof body === "object" && body !== null
        ? (body as { password?: unknown }).password
        : undefined;
    if (typeof password !== "string") {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }

    if (!(await passwordMatches(password))) {
      return NextResponse.json(
        { error: "Mot de passe incorrect" },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      await createSessionToken(),
      sessionCookieOptions(SESSION_MAX_AGE_SECONDS),
    );
    return response;
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", sessionCookieOptions(0));
  return response;
}
