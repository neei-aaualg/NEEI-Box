import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'neei_box_session';

export function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = Boolean(sessionCookie);

  const { pathname } = request.nextUrl;

  if (!isAuthenticated && pathname.startsWith('/api')) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  if (
    !isAuthenticated &&
    (pathname.startsWith('/courses') || pathname.startsWith('/admin'))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/courses';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Only these paths are protected by the proxy. Everything else — including
// public API routes such as /api/health and /api/auth/* — is left untouched.
export const config = {
  matcher: [
    '/courses/:path*',
    '/admin/:path*',
    '/login',
    '/api/materials/:path*',
    '/api/files/:path*',
    '/api/courses/:path*',
    '/api/admin/:path*',
  ],
};
