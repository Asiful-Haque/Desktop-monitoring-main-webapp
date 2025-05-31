
import { verifyToken } from '@/app/lib/auth';
import { NextRequest, NextResponse } from 'next/server';


export function middleware(req) {
  console.log('--- Middleware Triggered ---');
  const token = req.headers.get('authorization')?.replace('Bearer ', '');

  
  console.log('Requested path:', req.nextUrl.pathname);
  console.log('Authorization token:', token);

  const decoded = token && verifyToken(token);
  console.log('Token is valid:', !!decoded);

  const protectedPaths = ['/dashboard', '/profile', '/assign_task'];
  const isProtected = protectedPaths.some(path => req.nextUrl.pathname.startsWith(path));
  console.log('Is protected path:', isProtected);

  if (isProtected && !decoded) {
    console.log('Redirecting to / due to invalid or expired token.');
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/profile', '/assign_task'],
};


