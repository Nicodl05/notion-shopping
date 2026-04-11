import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    const appPassword = process.env.APP_PASSWORD;

    // Reject if APP_PASSWORD isn't configured for safety
    if (!appPassword) {
      return NextResponse.json(
        { error: "Authentification non configurée sur le serveur" },
        { status: 503 },
      );
    }

    if (password === appPassword) {
      // Create session cookie
      const response = NextResponse.json({ success: true });

      response.cookies.set("auth_token", appPassword, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 1 week
      });

      return response;
    }

    return NextResponse.json(
      { error: "Mot de passe incorrect" },
      { status: 401 },
    );
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
