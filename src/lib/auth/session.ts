import { SignJWT, jwtVerify } from "jose";
import { getAuthSecret } from "./secret";

export const SESSION_COOKIE_NAME = "bkh-session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface SessionPayload {
  sub: string; // user id
  email: string;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getAuthSecret());
}

/** Sign a session token for an authenticated user. */
export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

/** Verify a session token, returning its payload or null when invalid. */
export async function verifySession(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return null;
    }
    return { sub: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

/** Options for the session cookie. Secure + httpOnly + lax. */
export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
