import { cookies } from "next/headers";

const COOKIE_NAME = "arv_session";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const enc = new TextEncoder();

/**
 * Signing secret. Falls back to the admin password so a working setup needs
 * only one environment variable — with the useful side effect that changing
 * the password invalidates every existing session.
 */
function secret(): string {
  const s = process.env.AUTH_SECRET ?? process.env.ADMIN_PASSWORD;
  if (!s) throw new Error("ADMIN_PASSWORD 환경변수가 설정되지 않았습니다.");
  return s;
}

function toBase64Url(bytes: ArrayBuffer): string {
  return Buffer.from(bytes).toString("base64url");
}

async function sha256(value: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", enc.encode(value));
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

/** Constant-time comparison over equal-length byte arrays. */
function equalBytes(a: ArrayBuffer, b: ArrayBuffer): boolean {
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/**
 * Compare digests rather than the raw strings, so neither the length nor the
 * contents of the password leak through response timing.
 */
export async function verifyPassword(input: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const [a, b] = await Promise.all([sha256(input), sha256(expected)]);
  return equalBytes(a, b);
}

export async function startSession(): Promise<void> {
  const payload = `v1.${Date.now() + TTL_MS}`;
  const token = `${payload}.${await sign(payload)}`;

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return false;

  const cut = token.lastIndexOf(".");
  if (cut < 0) return false;

  const payload = token.slice(0, cut);
  const provided = token.slice(cut + 1);

  const expected = await sign(payload);
  if (!equalBytes(enc.encode(provided).buffer as ArrayBuffer, enc.encode(expected).buffer as ArrayBuffer)) {
    return false;
  }

  const expiresAt = Number(payload.split(".")[1]);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}
