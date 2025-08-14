// middleware.ts
import { verifyToken } from '@/app/lib/auth';
import { NextResponse } from 'next/server';

const ORIGIN_WHITELIST = new Set([
  'http://localhost:3000',
]);

function buildCorsHeaders(req) {
  const origin = req.headers.get('origin') || '';
  const headers = new Headers();

  if (ORIGIN_WHITELIST.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  }
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  return headers;
}

export function middleware(req) {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const method = req.method;

  // ------------------ CORS for API routes ------------------
  if (pathname.startsWith('/api')) {
    // Preflight
    if (method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: buildCorsHeaders(req),
      });
    }

    // Other API requests: pass through but attach CORS headers to the response
    const res = NextResponse.next();
    const cors = buildCorsHeaders(req);
    cors.forEach((v, k) => res.headers.set(k, v));
    return res;
  }

  // --------------- Auth for protected frontend routes ---------------
  const token = (req).cookies?.get?.('token')?.value; // Next middleware Request has cookies.get
  const decoded = token && verifyToken(token);

  const protectedPaths = ['/adminDashboard', '/tasks', '/assign_task', '/projectDetails'];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !decoded) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/adminDashboard', '/tasks', '/assign_task', '/projectDetails'],
};
