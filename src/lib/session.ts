import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Helper partagé entre src/proxy.ts et les route handlers.
// Uniquement Web Crypto (crypto.subtle) : compatible Node et Edge runtime.

export const SESSION_COOKIE_NAME = "auth_token";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 jours
const MIN_SECRET_LENGTH = 32;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Renvoie SESSION_SECRET si elle est présente et assez longue, sinon null. */
export function getSessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) return null;
  return secret;
}

/** Vrai seulement si APP_PASSWORD et SESSION_SECRET sont configurés. */
export function isAuthConfigured(): boolean {
  return Boolean(process.env.APP_PASSWORD) && getSessionSecret() !== null;
}

function bytesToBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBytes(input: string): Uint8Array<ArrayBuffer> | null {
  try {
    const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function importHmacKey(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

/** Crée un jeton `base64url(payload).base64url(HMAC-SHA256(payload))` avec exp (7 jours). */
export async function createSessionToken(now: number = Date.now()): Promise<string> {
  const secret = getSessionSecret();
  if (!secret) throw new Error("SESSION_SECRET non configurée");

  const exp = Math.floor(now / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = bytesToBase64url(encoder.encode(JSON.stringify({ exp })));
  const key = await importHmacKey(secret, "sign");
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(payload)),
  );
  return `${payload}.${bytesToBase64url(signature)}`;
}

/** Vérifie la signature (comparaison à temps constant via subtle.verify) et l'expiration. */
export async function verifySessionToken(
  token: string | null | undefined,
  now: number = Date.now(),
): Promise<boolean> {
  const secret = getSessionSecret();
  if (!secret || !token) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, signatureB64] = parts;

  const signature = base64urlToBytes(signatureB64);
  if (!payload || !signature) return false;

  const key = await importHmacKey(secret, "verify");
  const valid = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(payload));
  if (!valid) return false;

  const payloadBytes = base64urlToBytes(payload);
  if (!payloadBytes) return false;

  try {
    const data: unknown = JSON.parse(decoder.decode(payloadBytes));
    if (typeof data !== "object" || data === null) return false;
    const exp = (data as { exp?: unknown }).exp;
    return typeof exp === "number" && exp * 1000 > now;
  } catch {
    return false;
  }
}

async function sha256(input: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(input)));
}

/** Compare le mot de passe via des hash SHA-256 de même longueur, en temps constant. */
export async function passwordMatches(input: string): Promise<boolean> {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;

  const [a, b] = await Promise.all([sha256(input), sha256(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}

/** À appeler au début d'un route handler protégé : renvoie une 401 JSON si la session est absente. */
export async function requireApiSession(): Promise<NextResponse | null> {
  const store = await cookies();
  const valid = await verifySessionToken(store.get(SESSION_COOKIE_NAME)?.value);
  if (valid) return null;
  return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
}
