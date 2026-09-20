import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isCsrfExemptPath, isMutatingMethod, originAllowed } from '@/lib/csrf';
import { homePathForRole, isCustomerOnlyPath, isStaffRole, isVendorRole, normalizeRole } from '@/lib/roleHome';

function cookieRole(request: NextRequest): string {
  const raw = request.cookies.get('wwm_ui')?.value;
  if (!raw) return '';
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return normalizeRole(parsed?.role);
  } catch {
    return '';
  }
}

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

  if (pathname === '/admin/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const uiRole = cookieRole(request);

  if (isCustomerOnlyPath(pathname) && (isStaffRole(uiRole) || isVendorRole(uiRole))) {
    return NextResponse.redirect(new URL(homePathForRole(uiRole), request.url));
  }

  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('wwm_auth_token')?.value;
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
