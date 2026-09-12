import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

const SESSION = 'raw-token';
const BASE = 'https://example.com';

function makeRequest(pathname: string, withSession = false) {
  const headers = new Headers();
  if (withSession) headers.set('cookie', `neei_box_session=${SESSION}`);
  return new NextRequest(`${BASE}${pathname}`, { headers });
}

describe('proxy auth gate', () => {
  it.each([
    '/api/materials',
    '/api/materials/abc',
    '/api/files/foo.pdf',
    '/api/courses',
    '/api/courses/1',
    '/api/admin/users',
  ])('rejects unauthenticated API request to %s with 401', async (path) => {
    const res = proxy(makeRequest(path));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Não autorizado.');
  });

  it.each(['/courses', '/courses/1', '/admin', '/admin/users'])(
    'redirects unauthenticated %s to /login',
    (path) => {
      const res = proxy(makeRequest(path));
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe(`${BASE}/login`);
    }
  );

  it('redirects authenticated users away from /login to /courses', () => {
    const res = proxy(makeRequest('/login', true));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(`${BASE}/courses`);
  });

  it('allows authenticated API requests through', () => {
    const res = proxy(makeRequest('/api/courses', true));
    expect(res.status).toBe(200);
  });

  it('allows authenticated requests to protected pages through', () => {
    const res = proxy(makeRequest('/courses', true));
    expect(res.status).toBe(200);
    const res2 = proxy(makeRequest('/admin', true));
    expect(res2.status).toBe(200);
  });

  it('allows unauthenticated requests to the login page through', () => {
    const res = proxy(makeRequest('/login'));
    expect(res.status).toBe(200);
  });

  it('allows unauthenticated requests to public pages through', () => {
    expect(proxy(makeRequest('/')).status).toBe(200);
  });

  it('handles trailing slashes consistently', () => {
    const res = proxy(makeRequest('/courses/'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(`${BASE}/login`);
  });

  it('treats query strings on protected paths as protected', () => {
    const res = proxy(makeRequest('/courses?page=2'));
    expect(res.status).toBe(307);
  });

  it('does not match partial path prefixes (e.g. /courses-notes)', () => {
    const res = proxy(makeRequest('/courses-notes'));
    expect(res.status).toBe(200);
  });
});
