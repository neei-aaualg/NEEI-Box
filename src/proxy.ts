import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'neei_box_session';

function isProtectedPagePath(pathname: string): boolean {
  return (
    pathname === '/courses' ||
    pathname.startsWith('/courses/') ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/')
  );
}

export function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = Boolean(sessionCookie);

  const { pathname } = request.nextUrl;

  if (!isAuthenticated && pathname.startsWith('/api')) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  if (!isAuthenticated && isProtectedPagePath(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/courses', request.url));
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
