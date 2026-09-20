import { NextResponse } from 'next/server';

function clearAuthCookies(response: NextResponse) {
  response.cookies.set('wwm_auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  response.cookies.set('wwm_ui', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export async function GET(request: Request) {
  const url = new URL('/', request.url);
  const response = NextResponse.redirect(url);
  return clearAuthCookies(response);
}

export async function POST(request: Request) {
  const accept = request.headers.get('accept') || '';
  const wantsPage = accept.includes('text/html');
  const response = wantsPage
    ? NextResponse.redirect(new URL('/', request.url))
    : NextResponse.json({ success: true, message: 'Logged out successfully' });
  return clearAuthCookies(response);
}
