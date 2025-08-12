import { verifyToken } from '@/app/lib/auth';
import { NextResponse } from 'next/server';

export function middleware(req) {
  const { pathname, method } = req.nextUrl;

  // Handle CORS for API routes------------------------------------for fixing cors setup-----------------------------
  if (pathname.startsWith('/api')) {
    // Handle OPTIONS preflight
    if (method === 'OPTIONS') {
      const response = NextResponse.json(null, { status: 204 });
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return response;
    }

    // For other API requests, add CORS headers to response
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  }

  // Token validation for frontend protected routes----------------------for auth and authorizatioin------------
  const token = req.cookies.get('token')?.value;
  const decoded = token && verifyToken(token);

  const protectedPaths = ['/adminDashboard', '/tasks', '/assign_task'];
  const isProtected = protectedPaths.some(path => pathname.startsWith(path));

  if (isProtected && !decoded) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/adminDashboard', '/tasks', '/assign_task'],
};
