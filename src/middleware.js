// middleware.js
import { NextResponse } from "next/server";
import { verifyToken, verifyRefreshToken, signToken, signRefreshToken } from "@/app/lib/auth";

const ORIGIN_WHITELIST = new Set(["http://localhost:3000", "null"]); // "null" for Electron file://
const PROTECTED_PAGES = ["/adminDashboard", "/tasks", "/assign_task", "/time-sheet", "/projectDetails", "/profile"];

function buildCorsHeaders(req) {
  const origin = req.headers.get("origin") || "";
  const h = new Headers();
  if (ORIGIN_WHITELIST.has(origin)) {
    h.set("Access-Control-Allow-Origin", origin);
    h.set("Access-Control-Allow-Credentials", "true");
  }
  h.set("Vary", "Origin");
  h.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  return h;
}

function cookieAttrsFor(req) {
  const isHttps = new URL(req.url).protocol === "https:";
  return isHttps
    ? { httpOnly: true, sameSite: "none", secure: true,  path: "/" }   // prod/https
    : { httpOnly: true, sameSite: "lax",  secure: false, path: "/" };  // http localhost
}

/**
 * If access token is valid -> returns NextResponse.next().
 * Else if refresh is valid -> rotates cookies and returns NextResponse with Set-Cookie.
 * Else -> returns null.
 */
async function ensureFreshAuth(req) {
  const token   = req.cookies?.get?.("token")?.value || null;
  const refresh = req.cookies?.get?.("refresh_token")?.value || null;

  if (token) {
    const ok = await verifyToken(token).catch(() => null);
    if (ok) return NextResponse.next();
  }

  if (refresh) {
    const payload = await verifyRefreshToken(refresh).catch(() => null);
    if (payload) {
      const newAccess  = await signToken(payload);
      const newRefresh = await signRefreshToken(payload);
      const res = NextResponse.next();
      const attrs = cookieAttrsFor(req);
      res.cookies.set("token",         newAccess,  { ...attrs, maxAge: 60 * 60 });          // 1h
      res.cookies.set("refresh_token", newRefresh, { ...attrs, maxAge: 30 * 24 * 3600 });   // 30d
      return res;
    }
  }

  return null;
}

export async function middleware(req) {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const method = req.method;

  // ---------- API: CORS + silent refresh ----------
  if (pathname.startsWith("/api")) {
    if (method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: buildCorsHeaders(req) });
    }

    const maybeAuthed = await ensureFreshAuth(req);
    const res = maybeAuthed ?? NextResponse.next();

    // Always attach CORS on API
    const cors = buildCorsHeaders(req);
    cors.forEach((v, k) => res.headers.set(k, v));
    return res;
  }

  // ---------- Frontend protected routes ----------
  const isProtected = PROTECTED_PAGES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const maybeAuthed = await ensureFreshAuth(req);
  if (maybeAuthed) return maybeAuthed;

  // Not authed -> go to login/root
  return NextResponse.redirect(new URL("/", req.url));
}

export const config = {
  matcher: ["/api/:path*", "/adminDashboard", "/tasks", "/assign_task", "/time-sheet", "/projectDetails/:path*", "/profile/:path*"],
};
