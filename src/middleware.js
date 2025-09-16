// middleware.ts
import { NextResponse } from "next/server";
import { verifyToken, verifyRefreshToken, signToken, signRefreshToken } from "@/app/lib/auth";

const ORIGIN_WHITELIST = new Set(["http://localhost:3000","null"]);

function buildCorsHeaders(req) {
  const origin = req.headers.get("origin") || "";
  const headers = new Headers();
  if (ORIGIN_WHITELIST.has(origin)) {
    console.log(`origin from header ------------------- : ${origin}`);
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  return headers;
}

// 👇 Use this instead of BASE_COOKIE:
function cookieAttrsFor(req) {
  const isHttps = new URL(req.url).protocol === "https:";
  if (isHttps) {
    // HTTPS (prod, or dev over https): allow cross-site
    return { httpOnly: true, sameSite: "none" , secure: true, path: "/" };
  }
  // HTTP localhost dev: avoid None+Secure rejection
  return { httpOnly: true, sameSite: "lax" , secure: false, path: "/" };
}

export async function middleware(req) {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const method = req.method;

  // ------------------ CORS for API routes ------------------
  if (pathname.startsWith("/api")) {
    if (method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: buildCorsHeaders(req) });
    }
    const res = NextResponse.next();
    const cors = buildCorsHeaders(req);
    cors.forEach((v, k) => res.headers.set(k, v));
    return res;
  }

  // --------------- Auth for protected frontend routes ---------------
  const protectedPaths = ["/adminDashboard", "/tasks", "/assign_task", "/projectDetails"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = req.cookies?.get?.("token")?.value || null;
  const refresh = req.cookies?.get?.("refresh_token")?.value || null;

  if (token) { // if token is there..no need for refresh token
    const payload = await verifyToken(token).catch(() => null);
    if (payload) return NextResponse.next();
  }

  if (refresh) { // if no token is there..i mean deleted or removed by time out or manually...then 
    // the refresh token will be there to generate new access and refresh token....cz refresh also 
    // has the same payload as access token...but longer expiry time...this way it helps in absence of access token
    const payload = await verifyRefreshToken(refresh).catch(() => null);
    if (payload) {
      const newAccess = await signToken(payload);
      const newRefresh = await signRefreshToken(payload);

      const res = NextResponse.next();
      const attrs = cookieAttrsFor(req);
      console.log("Setting new cookies from middleware (refresh succeeded)");
      res.cookies.set("token", newAccess, { ...attrs, maxAge: 60 * 60 });                 // 1h
      res.cookies.set("refresh_token", newRefresh, { ...attrs, maxAge: 30 * 24 * 3600 }); // 30d
      return res;
    }
  }

  // No valid tokens -> login
  return NextResponse.redirect(new URL("/", req.url));
}

export const config = {
  matcher: ["/api/:path*", "/adminDashboard", "/tasks", "/assign_task", "/projectDetails/:path*"],
};
