import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/env';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip login page
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // Protect /admin/* and /api/admin/* routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const token = request.cookies.get('admin_session')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    try {
      // Verify JWT signature and expiry only (no DB check in middleware)
      await jwtVerify(token, getJwtSecret());
      return NextResponse.next();
    } catch {
      const response = NextResponse.redirect(
        new URL('/admin/login', request.url)
      );
      response.cookies.delete('admin_session');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
