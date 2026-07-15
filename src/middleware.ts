import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

/**
 * Edge guard for authenticated areas. This is a coarse first gate: it checks
 * for a *valid* session signature before letting a request reach /admin or
 * /portal. Fine-grained authorization (admin vs customer, capability checks)
 * happens server-side in layouts and actions, which can read the database.
 *
 * We verify the JWT signature here rather than merely checking cookie
 * presence, so a forged or tampered cookie is rejected at the edge.
 */
const PROTECTED_PREFIXES = ["/admin", "/portal"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProtected(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secret = process.env.AUTH_SECRET;

  let valid = false;
  if (token && secret) {
    try {
      await jwtVerify(token, new TextEncoder().encode(secret));
      valid = true;
    } catch {
      valid = false;
    }
  }

  if (!valid) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const res = NextResponse.redirect(loginUrl);
    // Clear any stale/invalid session cookie.
    if (token) res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*"],
};
