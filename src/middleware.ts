import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isCsrfExemptPath, isMutatingMethod, originAllowed } from '@/lib/csrf';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/api/') &&
    isMutatingMethod(request.method) &&
    !isCsrfExemptPath(pathname)
  ) {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    if (!originAllowed(request.url, origin, referer)) {
      return NextResponse.json({ success: false, message: 'Invalid request origin' }, { status: 403 });
    }
  }

  const response = NextResponse.next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = request.cookies.get('wwm_auth_token')?.value;
    if (!token) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
