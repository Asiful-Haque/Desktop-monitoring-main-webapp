// middleware.js
import { NextResponse } from "next/server";
import {
  verifyToken,
  verifyRefreshToken,
  signToken,
  signRefreshToken,
} from "@/app/lib/auth";

const ORIGIN_WHITELIST = new Set(["http://localhost:3000", "null"]); // "null" for Electron file://
const PROTECTED_PAGES = [
  "/adminDashboard",
  "/tasks",
  "/assign_task",
  "/time-sheet",
  "/payroll",
  "/manual-time",
  "/projectDetails",
  "/profile",
  "/attendance",
];

function buildCorsHeaders(req) {
  const origin = req.headers.get("origin") || "";
  const h = new Headers();
  if (ORIGIN_WHITELIST.has(origin)) {
    h.set("Access-Control-Allow-Origin", origin);
    h.set("Access-Control-Allow-Credentials", "true");
  }
  h.set("Vary", "Origin");
  h.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  h.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  return h;
}
function cookieAttrsFor(req) {
  const isHttps = new URL(req.url).protocol === "https:";
  return isHttps
    ? { httpOnly: true, sameSite: "none", secure: true, path: "/" } // prod/https
    : { httpOnly: true, sameSite: "lax", secure: false, path: "/" }; // http localhost
}
async function ensureFreshAuth(req) {
  const token = req.cookies?.get?.("token")?.value || null;
  const refresh = req.cookies?.get?.("refresh_token")?.value || null;

if (token) {
  const payload = await verifyToken(token).catch(() => null); 
  if (payload) {
    return { res: NextResponse.next(), payload }; 
  }
}

  if (refresh) {
    const payload = await verifyRefreshToken(refresh).catch(() => null);
    if (payload) {
      const newAccess = await signToken(payload);
      const newRefresh = await signRefreshToken(payload);
      const res = NextResponse.next();
      const attrs = cookieAttrsFor(req);
      res.cookies.set("token", newAccess, { ...attrs, maxAge: 60 * 60 }); // 1h
      res.cookies.set("refresh_token", newRefresh, {
        ...attrs,
        maxAge: 30 * 24 * 3600,
      }); // 30d
      return {
        res, payload
      };
    }
  }

  return null;
}
console.log("Middleware initialized. Protected pages:", PROTECTED_PAGES);

const ROLE_GUARDS = [
  {
    prefix: "/adminDashboard",
    allowed: ["Developer", "Admin", "Project Manager", "CEO", "Team Lead", "Freelancer"],
  },
  {
    prefix: "/tasks",
    allowed: ["Developer", "Admin", "Project Manager", "Team Lead", "Freelancer"],
  },
  {
    prefix: "/meetings",
    allowed: ["Developer", "Admin", "Project Manager", "Team Lead"],
  },
  { prefix: "/gallery", allowed: ["Admin", "Project Manager", "CEO"] },
  {
    prefix: "/team",
    allowed: ["Developer", "Admin", "Project Manager", "CEO", "Team Lead"],
  },
  { prefix: "/analytics", allowed: ["Admin", "Project Manager"] },
  { prefix: "/settings", allowed: ["Admin"] },
  { prefix: "/time-sheet", allowed: ["Developer", "Admin", "Freelancer"] },
  {
    prefix: "/payroll",
    allowed: ["Developer", "Admin", "Project Manager", "CEO", "Team Lead", "Freelancer"],
  },
  { prefix: "/manual-time", allowed: ["Developer", "Freelancer"] },
  { prefix: "/attendance", allowed: ["Admin"] }
];
function findGuard(pathname) {
  return ROLE_GUARDS.find((g) => pathname.startsWith(g.prefix)) || null;
}
export async function middleware(req) {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const method = req.method;
  // ---------- API: CORS + silent refresh ----------
  if (pathname.startsWith("/api")) {
    if (method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: buildCorsHeaders(req),
      });
    }

    const maybeAuthed = await ensureFreshAuth(req);
    const res = (maybeAuthed?.res) ?? NextResponse.next();

    // Always attach CORS on API
    const cors = buildCorsHeaders(req);
    cors.forEach((v, k) => res.headers.set(k, v));
    return res;
  }

  // ---------- Frontend protected routes ----------
  // 1. checks only authorized or not. If authorized, go next.
  // 2. If not authorized, redirect to / (login)
  // 3. If authorized, check role rules (if any)
  // 4. If role rule exists, check if user role is allowed
  // 5. If not allowed, redirect to /unauthorized

  const isProtected = PROTECTED_PAGES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next(); // Protected but no role rule.any auth user can get access
  const auth = await ensureFreshAuth(req);
    if (!auth) {
    return NextResponse.redirect(new URL("/", req.url)); 
  }
  const guard = findGuard(pathname);
  if (guard) {
    const role = auth.payload?.role; 
    if (!guard.allowed.includes(role)) {
      console.log("Role", role, "not allowed to access", pathname);
      return NextResponse.redirect(new URL("/not-allowd", req.url));
    }
  }
    return auth.res || NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/adminDashboard",
    "/tasks",
    "/assign_task",
    "/time-sheet",
    "/payroll",
    "/manual-time",
    "/projectDetails/:path*",
    "/profile/:path*",
  ],
};
