import { describe, it, expect, vi, beforeEach } from 'vitest';

const Role = {
  STUDENT: 'STUDENT',
  ADMIN: 'ADMIN',
} as const;

const prismaMocks = vi.hoisted(() => ({
  user: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
}));

const sessionMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  default: prismaMocks,
}));

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: sessionMocks.getCurrentUser,
}));

import { GET, POST } from '@/app/api/admin/users/route';
import { PATCH } from '@/app/api/admin/users/[id]/route';

const adminUser = {
  id: 'admin-1',
  email: 'admin@neei.online',
  role: 'ADMIN' as const,
  createdAt: new Date('2026-01-01'),
};
const studentUser = {
  id: 'student-1',
  email: 'a12345@ualg.pt',
  role: 'STUDENT' as const,
  createdAt: new Date('2026-02-01'),
};

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/admin/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function paramsWrapper(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/admin/users', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when the caller is not an admin', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(studentUser);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('returns 403 when unauthenticated', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('returns the user list for admins', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.user.findMany.mockResolvedValue([adminUser, studentUser]);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users).toHaveLength(2);
    expect(body.users[0]).toEqual({
      id: 'admin-1',
      email: 'admin@neei.online',
      role: 'ADMIN',
      created_at: '2026-01-01T00:00:00.000Z',
    });
  });

  it('sorts users by role and creation date', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.user.findMany.mockResolvedValue([]);
    await GET();
    expect(prismaMocks.user.findMany).toHaveBeenCalledWith({
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    });
  });
});

describe('POST /api/admin/users', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 when the caller is not an admin', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(studentUser);
    const res = await POST(jsonRequest({ email: 'x@y.com' }));
    expect(res.status).toBe(403);
  });

  it('rejects a missing email', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    const res = await POST(jsonRequest({}));
    expect(res.status).toBe(400);
  });

  it('rejects an invalid email format', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    for (const email of [
      'not-an-email',
      'a@b',
      '@domain.com',
      'u@',
      'x',
      'a b.com',
    ]) {
      const res = await POST(jsonRequest({ email }));
      expect(res.status).toBe(400);
    }
  });

  it('accepts a valid email and normalizes it', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.user.upsert.mockResolvedValue(studentUser);
    const res = await POST(
      jsonRequest({ email: '  A12345@UALG.PT ', role: 'STUDENT' })
    );
    expect(res.status).toBe(200);
    expect(prismaMocks.user.upsert).toHaveBeenCalledWith({
      where: { email: 'a12345@ualg.pt' },
      update: { role: Role.STUDENT },
      create: { email: 'a12345@ualg.pt', role: Role.STUDENT },
    });
  });

  it('defaults to ADMIN role for any non-STUDENT value', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.user.upsert.mockResolvedValue(adminUser);
    for (const role of ['ADMIN', undefined, 'anything', '']) {
      const res = await POST(jsonRequest({ email: 'a@b.com', role }));
      expect(res.status).toBe(200);
      expect(prismaMocks.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { role: Role.ADMIN },
          create: expect.objectContaining({ role: Role.ADMIN }),
        })
      );
      vi.clearAllMocks();
      sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
      prismaMocks.user.upsert.mockResolvedValue(adminUser);
    }
  });

  it('sets STUDENT role explicitly', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.user.upsert.mockResolvedValue(studentUser);
    const res = await POST(jsonRequest({ email: 'a@b.com', role: 'STUDENT' }));
    const body = await res.json();
    expect(body.user.role).toBe('STUDENT');
  });

  it('returns a helpful confirmation message', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.user.upsert.mockResolvedValue(adminUser);
    const res = await POST(jsonRequest({ email: 'a@b.com', role: 'ADMIN' }));
    const body = await res.json();
    expect(body.message).toContain('Administrador');
  });
});

describe('PATCH /api/admin/users/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 for non-admin callers', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(studentUser);
    const res = await PATCH(
      jsonRequest({ role: 'STUDENT' }),
      paramsWrapper('u1')
    );
    expect(res.status).toBe(403);
  });

  it('returns 400 for an invalid role', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    for (const role of ['USER', 'SUPERADMIN', '']) {
      const res = await PATCH(jsonRequest({ role }), paramsWrapper('u1'));
      expect(res.status).toBe(400);
    }
  });

  it('blocks self-demotion', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    const res = await PATCH(
      jsonRequest({ role: 'STUDENT' }),
      paramsWrapper('admin-1')
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/despromover/i);
  });

  it('allows an admin to reaffirm their own ADMIN role', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.user.update.mockResolvedValue(adminUser);
    const res = await PATCH(
      jsonRequest({ role: 'ADMIN' }),
      paramsWrapper('admin-1')
    );
    expect(res.status).toBe(200);
    expect(prismaMocks.user.count).not.toHaveBeenCalled();
  });

  it('returns 404 when the target user does not exist', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.user.findUnique.mockResolvedValue(null);
    const res = await PATCH(
      jsonRequest({ role: 'STUDENT' }),
      paramsWrapper('missing')
    );
    expect(res.status).toBe(404);
  });

  it('blocks demoting the only administrator', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    const otherAdmin = { ...adminUser, id: 'admin-2' };
    prismaMocks.user.findUnique.mockResolvedValue(otherAdmin);
    prismaMocks.user.count.mockResolvedValue(1);
    const res = await PATCH(
      jsonRequest({ role: 'STUDENT' }),
      paramsWrapper('admin-2')
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/único administrador/i);
  });

  it('allows demoting another admin when more than one exists', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    const otherAdmin = { ...adminUser, id: 'admin-2' };
    prismaMocks.user.findUnique.mockResolvedValue(otherAdmin);
    prismaMocks.user.count.mockResolvedValue(2);
    prismaMocks.user.update.mockResolvedValue({
      ...otherAdmin,
      role: 'STUDENT',
    });

    const res = await PATCH(
      jsonRequest({ role: 'STUDENT' }),
      paramsWrapper('admin-2')
    );
    expect(res.status).toBe(200);
    expect(prismaMocks.user.update).toHaveBeenCalledWith({
      where: { id: 'admin-2' },
      data: { role: 'STUDENT' },
    });
  });

  it('does not run the admin-count check when targeting a student', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.user.findUnique.mockResolvedValue(studentUser);
    prismaMocks.user.update.mockResolvedValue(studentUser);
    await PATCH(jsonRequest({ role: 'STUDENT' }), paramsWrapper('student-1'));
    expect(prismaMocks.user.count).not.toHaveBeenCalled();
  });

  it('returns 500 when the database throws', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.user.update.mockRejectedValue(new Error('db down'));
    const res = await PATCH(
      jsonRequest({ role: 'ADMIN' }),
      paramsWrapper('u1')
    );
    expect(res.status).toBe(500);
  });

  it('returns a normalized user payload with created_at', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.user.update.mockResolvedValue(adminUser);
    const res = await PATCH(
      jsonRequest({ role: 'ADMIN' }),
      paramsWrapper('u1')
    );
    const body = await res.json();
    expect(body.user).toEqual({
      id: 'admin-1',
      email: 'admin@neei.online',
      role: 'ADMIN',
      created_at: '2026-01-01T00:00:00.000Z',
    });
  });
});
