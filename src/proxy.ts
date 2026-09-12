import { NextResponse, type NextRequest } from 'next/server';
import { rateLimit, clientIpFromHeaders } from '@/lib/rate-limit';

const SESSION_COOKIE_NAME = '__Host-neei_box_session';

function isProtectedPagePath(pathname: string): boolean {
  return (
    pathname === '/courses' ||
    pathname.startsWith('/courses/') ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/')
  );
}

const PUBLIC_API_PREFIXES = ['/api/auth', '/api/health'];

function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// Route-group rate limits. The first matching rule wins.
const RATE_LIMITS: Array<{
  pattern: RegExp;
  limit: number;
  windowMs: number;
}> = [
  // Auth endpoints are the primary abuse target (mailbox flooding, OTP churn).
  { pattern: /^\/api\/auth\/(login|verify)/, limit: 10, windowMs: 60_000 },
  // File downloads and previews need headroom for material thumbnails.
  { pattern: /^\/api\/files\//, limit: 300, windowMs: 60_000 },
  // All remaining API routes.
  { pattern: /^\/api\//, limit: 120, windowMs: 60_000 },
  // Page navigation (generous; protects against naive scraping).
  { pattern: /.*/, limit: 300, windowMs: 60_000 },
];

function getRateLimit(pathname: string) {
  for (const rule of RATE_LIMITS) {
    if (rule.pattern.test(pathname)) return rule;
  }
  return RATE_LIMITS[RATE_LIMITS.length - 1];
}

export function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = Boolean(sessionCookie);

  const { pathname } = request.nextUrl;

  const rule = getRateLimit(pathname);
  const ip = clientIpFromHeaders(request.headers);
  const { allowed, retryAfterMs } = rateLimit(
    `proxy:${rule.limit}:${rule.windowMs}:${ip}`,
    rule.limit,
    rule.windowMs
  );

  if (!allowed) {
    const seconds = retryAfterMs
      ? Math.ceil(retryAfterMs / 1000)
      : rule.windowMs / 1000;
    return NextResponse.json(
      { error: `Demasiados pedidos. Aguarda ${seconds}s e tenta novamente.` },
      {
        status: 429,
        headers: {
          'Retry-After': String(seconds),
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  if (
    !isAuthenticated &&
    pathname.startsWith('/api') &&
    !isPublicApiPath(pathname)
  ) {
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

// Only these paths are processed by the proxy. Everything else — including
// public API routes such as /api/health and /api/auth/* — is left untouched.
export const config = {
  matcher: [
    '/courses/:path*',
    '/admin/:path*',
    '/login',
    '/api/auth/:path*',
    '/api/health',
    '/api/materials/:path*',
    '/api/files/:path*',
    '/api/courses/:path*',
    '/api/admin/:path*',
  ],
};
