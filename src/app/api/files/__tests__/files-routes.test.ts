import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const sessionMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

const storageMocks = vi.hoisted(() => ({
  getFileStats: vi.fn(),
}));

const fsMocks = vi.hoisted(() => ({
  readFile: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: sessionMocks.getCurrentUser,
}));

vi.mock('@/lib/storage', () => ({
  getFileStats: storageMocks.getFileStats,
}));

vi.mock('fs/promises', () => ({
  default: fsMocks,
  readFile: fsMocks.readFile,
}));

import { GET } from '@/app/api/files/[...path]/route';
import { GET as healthGET } from '@/app/api/health/route';

const user = { id: 'u1', email: 'a12345@ualg.pt', role: 'STUDENT' };

function paramsWrapper(pathParts: string[]) {
  return { params: Promise.resolve({ path: pathParts }) };
}

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/files/u1/a.pdf');
}

describe('GET /api/files/[...path]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(null);
    const res = await GET(makeRequest(), paramsWrapper(['u1', 'a.pdf']));
    expect(res.status).toBe(401);
  });

  it('returns 404 when the file does not exist', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(user);
    storageMocks.getFileStats.mockResolvedValue(null);
    const res = await GET(makeRequest(), paramsWrapper(['u1', 'a.pdf']));
    expect(res.status).toBe(404);
  });

  it('serves the file with a derived MIME type and cache headers', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(user);
    storageMocks.getFileStats.mockResolvedValue({
      fullPath: '/var/uploads/u1/a.pdf',
      size: 42,
      mtime: new Date(),
    });
    fsMocks.readFile.mockResolvedValue(Buffer.from('pdf-content'));

    const res = await GET(makeRequest(), paramsWrapper(['u1', 'a.pdf']));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-length')).toBe('42');
    expect(res.headers.get('cache-control')).toBe(
      'private, max-age=31536000, immutable'
    );
  });

  it('adds security headers to every file response', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(user);
    storageMocks.getFileStats.mockResolvedValue({
      fullPath: '/var/uploads/u1/a.pdf',
      size: 3,
      mtime: new Date(),
    });
    fsMocks.readFile.mockResolvedValue(Buffer.from('pdf'));

    const res = await GET(makeRequest(), paramsWrapper(['u1', 'a.pdf']));
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-security-policy')).toBe(
      "default-src 'none'; sandbox"
    );
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
  });

  it('forces documents to download as attachments', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(user);
    storageMocks.getFileStats.mockResolvedValue({
      fullPath: '/var/uploads/u1/a.pdf',
      size: 3,
      mtime: new Date(),
    });
    fsMocks.readFile.mockResolvedValue(Buffer.from('pdf'));

    const res = await GET(makeRequest(), paramsWrapper(['u1', 'a.pdf']));
    expect(res.headers.get('content-disposition')).toBe(
      'attachment; filename="a.pdf"'
    );
  });

  it('forces active content such as SVG to octet-stream attachments', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(user);
    storageMocks.getFileStats.mockResolvedValue({
      fullPath: '/var/uploads/u1/evil.svg',
      size: 10,
      mtime: new Date(),
    });
    fsMocks.readFile.mockResolvedValue(
      Buffer.from('<script>alert(1)</script>')
    );

    const res = await GET(makeRequest(), paramsWrapper(['u1', 'evil.svg']));
    expect(res.headers.get('content-type')).toBe('application/octet-stream');
    expect(res.headers.get('content-disposition')).toBe(
      'attachment; filename="evil.svg"'
    );
  });

  it('serves raster images inline for previews', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(user);
    storageMocks.getFileStats.mockResolvedValue({
      fullPath: '/var/uploads/u1/foto.png',
      size: 5,
      mtime: new Date(),
    });
    fsMocks.readFile.mockResolvedValue(Buffer.from('png'));
    const res = await GET(makeRequest(), paramsWrapper(['u1', 'foto.png']));
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('content-disposition')).toBe(
      'inline; filename="foto.png"'
    );
  });

  it('uses octet-stream for unknown extensions', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(user);
    storageMocks.getFileStats.mockResolvedValue({
      fullPath: '/var/uploads/u1/a.weird',
      size: 3,
      mtime: new Date(),
    });
    fsMocks.readFile.mockResolvedValue(Buffer.from('abc'));

    const res = await GET(makeRequest(), paramsWrapper(['u1', 'a.weird']));
    expect(res.headers.get('content-type')).toBe('application/octet-stream');
  });

  it('joins multi-part paths', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(user);
    storageMocks.getFileStats.mockResolvedValue({
      fullPath: '/var/uploads/u1/sub/deep/a.pdf',
      size: 1,
      mtime: new Date(),
    });
    fsMocks.readFile.mockResolvedValue(Buffer.from('x'));
    const res = await GET(
      makeRequest(),
      paramsWrapper(['u1', 'sub', 'deep', 'a.pdf'])
    );
    expect(storageMocks.getFileStats).toHaveBeenCalledWith('u1/sub/deep/a.pdf');
    expect(res.status).toBe(200);
  });

  it('resolves an empty path to an empty relative path', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(user);
    storageMocks.getFileStats.mockResolvedValue(null);
    const res = await GET(makeRequest(), paramsWrapper([]));
    expect(storageMocks.getFileStats).toHaveBeenCalledWith('');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/health', () => {
  it('returns status ok with a timestamp', async () => {
    const before = Date.now();
    const res = await healthGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(new Date(body.timestamp).getTime()).toBeGreaterThanOrEqual(before);
  });
});
