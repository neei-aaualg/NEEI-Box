import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE_NAME = 'neei_box_session';

export function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = Boolean(sessionCookie);

  const { pathname } = request.nextUrl;

  if (!isAuthenticated && pathname.startsWith('/api/materials')) {
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

export const config = {
  matcher: ['/((?!api/materials/upload|api/health|api/files|.*\\..*).*)'],
};
