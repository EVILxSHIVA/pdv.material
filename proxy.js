import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // 1. Whitelist static assets & internal Next.js paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icon.svg") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/public") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Auth API routes and Webhook sync routes are open
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/sync-sheets")) {
    return NextResponse.next();
  }

  // 3. Public Auth Pages: ALWAYS ALLOW viewing login, forgot-password, reset-password
  if (
    pathname === "/login" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/unauthorized"
  ) {
    return NextResponse.next();
  }

  // 4. Extract and verify session cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionCookie ? await verifySessionToken(sessionCookie) : null;

  // 5. If user is logged in as SUPPLIER and visits admin-specific write operations or wants to view supplier dashboard
  if (session && session.role === "SUPPLIER") {
    // If supplier visits root `/`, route them to `/supplier` portal for convenience
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/supplier", request.url));
    }
  }

  // Pass request through with headers
  const requestHeaders = new Headers(request.headers);
  if (session) {
    requestHeaders.set("x-user-id", session.id || "");
    requestHeaders.set("x-user-role", session.role || "");
    requestHeaders.set("x-user-email", session.email || "");
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
