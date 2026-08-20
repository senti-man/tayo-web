import "server-only";
import { cookies } from "next/headers";
import { randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

const CSRF_COOKIE = "tayo_csrf";
const CSRF_HEADER = "x-csrf-token";

// Double-submit cookie pattern: the token is readable by client JS (not
// httpOnly) so the frontend can echo it back in a header. A cross-site page
// can trigger a request but cannot read the cookie to forge the header,
// which is what makes this defend against CSRF.
export async function ensureCsrfCookie(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CSRF_COOKIE)?.value;
  if (existing) return existing;

  const token = randomBytes(32).toString("hex");
  store.set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return token;
}

export async function verifyCsrf(request: NextRequest): Promise<boolean> {
  const store = await cookies();
  const cookieToken = store.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken) return false;
  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const CSRF_HEADER_NAME = CSRF_HEADER;
