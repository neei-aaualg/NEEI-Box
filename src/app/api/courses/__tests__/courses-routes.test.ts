import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMocks = vi.hoisted(() => ({
  course: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  material: {
    findMany: vi.fn(),
  },
}));

const sessionMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

const storageMocks = vi.hoisted(() => ({
  deleteFile: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  default: prismaMocks,
}));

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: sessionMocks.getCurrentUser,
}));

vi.mock('@/lib/storage', () => ({
  deleteFile: storageMocks.deleteFile,
}));

import { GET, POST } from '@/app/api/courses/route';
import { PATCH, DELETE } from '@/app/api/courses/[id]/route';

const adminUser = { id: 'admin-1', email: 'admin@neei.online', role: 'ADMIN' };
const studentUser = {
  id: 'student-1',
  email: 'a12345@ualg.pt',
  role: 'STUDENT',
};

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/courses', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function paramsWrapper(id: string) {
  return { params: Promise.resolve({ id }) };
}

const dbCourse = {
  id: 'c1',
  name: 'Lógica Matemática',
  year: 1,
  semester: 1,
  createdAt: new Date('2026-09-01'),
  _count: { materials: 3 },
};

describe('GET /api/courses', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns normalized courses when authenticated', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(studentUser);
    prismaMocks.course.findMany.mockResolvedValue([dbCourse]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([
      {
        id: 'c1',
        name: 'Lógica Matemática',
        year: 1,
        semester: 1,
        created_at: '2026-09-01T00:00:00.000Z',
        materials_count: 3,
      },
    ]);
  });

  it('orders courses by name ascending', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(studentUser);
    prismaMocks.course.findMany.mockResolvedValue([]);
    await GET();
    expect(prismaMocks.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { name: 'asc' },
      })
    );
  });
});

describe('POST /api/courses', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 for non-admin users', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(studentUser);
    const res = await POST(
      jsonRequest({ name: 'Cálculo', year: 1, semester: 2 })
    );
    expect(res.status).toBe(403);
  });

  it('returns 403 when unauthenticated', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(null);
    const res = await POST(
      jsonRequest({ name: 'Cálculo', year: 1, semester: 2 })
    );
    expect(res.status).toBe(403);
  });

  it('rejects missing name for admins', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    const res = await POST(jsonRequest({ year: 1, semester: 2 }));
    expect(res.status).toBe(400);
  });

  it('rejects non-numeric year or semester', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    const res = await POST(
      jsonRequest({ name: 'Cálculo', year: '1', semester: 2 })
    );
    expect(res.status).toBe(400);
    const res2 = await POST(
      jsonRequest({ name: 'Cálculo', year: 1, semester: '2' })
    );
    expect(res2.status).toBe(400);
  });

  it('rejects zero semester', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    const res = await POST(
      jsonRequest({ name: 'Cálculo', year: 1, semester: 0 })
    );
    expect(res.status).toBe(400);
  });

  it('rejects semester values above 2', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    const res = await POST(
      jsonRequest({ name: 'Cálculo', year: 1, semester: 3 })
    );
    expect(res.status).toBe(400);
  });

  it('rejects zero or negative year', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    const res = await POST(
      jsonRequest({ name: 'Cálculo', year: 0, semester: 1 })
    );
    expect(res.status).toBe(400);
    const res2 = await POST(
      jsonRequest({ name: 'Cálculo', year: -2, semester: 1 })
    );
    expect(res2.status).toBe(400);
  });

  it('rejects fractional year or semester', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    const res = await POST(
      jsonRequest({ name: 'Cálculo', year: 1.5, semester: 1 })
    );
    expect(res.status).toBe(400);
  });

  it('creates a course trimmed and returns it normalized', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.course.create.mockResolvedValue({
      id: 'c2',
      name: 'Cálculo',
      year: 1,
      semester: 2,
      createdAt: new Date('2026-09-02'),
    });
    const res = await POST(
      jsonRequest({ name: '  Cálculo  ', year: 1, semester: 2 })
    );
    expect(res.status).toBe(200);
    expect(prismaMocks.course.create).toHaveBeenCalledWith({
      data: { name: 'Cálculo', year: 1, semester: 2 },
    });
    const body = await res.json();
    expect(body.materials_count).toBe(0);
    expect(body.name).toBe('Cálculo');
  });

  it('returns 500 when the database throws', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.course.create.mockRejectedValue(new Error('db down'));
    const res = await POST(
      jsonRequest({ name: 'Cálculo', year: 1, semester: 2 })
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('db down');
  });
});

describe('PATCH /api/courses/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 for non-admin users', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(studentUser);
    const res = await PATCH(
      jsonRequest({ name: 'Novo Nome' }),
      paramsWrapper('c1')
    );
    expect(res.status).toBe(403);
  });

  it('returns 403 when unauthenticated', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(null);
    const res = await PATCH(
      jsonRequest({ name: 'Novo Nome' }),
      paramsWrapper('c1')
    );
    expect(res.status).toBe(403);
  });

  it('updates the name with trimming', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.course.update.mockResolvedValue({
      ...dbCourse,
      name: 'Novo Nome',
    });
    const res = await PATCH(
      jsonRequest({ name: '  Novo Nome  ' }),
      paramsWrapper('c1')
    );
    expect(res.status).toBe(200);
    expect(prismaMocks.course.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: 'Novo Nome' },
      })
    );
  });

  it('updates year and semester when numeric', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.course.update.mockResolvedValue({ ...dbCourse, year: 2 });
    const res = await PATCH(jsonRequest({ year: 2 }), paramsWrapper('c1'));
    expect(res.status).toBe(200);
    expect(prismaMocks.course.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { year: 2 } })
    );
  });

  it('rejects non-numeric updates', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    const res = await PATCH(jsonRequest({ year: 'lixo' }), paramsWrapper('c1'));
    expect(res.status).toBe(400);
    const res2 = await PATCH(jsonRequest({ semester: 0 }), paramsWrapper('c1'));
    expect(res2.status).toBe(400);
  });

  it('returns a normalized response with materials_count', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.course.update.mockResolvedValue({
      ...dbCourse,
      _count: { materials: 7 },
    });
    const res = await PATCH(jsonRequest({ name: 'X' }), paramsWrapper('c1'));
    const body = await res.json();
    expect(body.materials_count).toBe(7);
    expect(body.created_at).toBe('2026-09-01T00:00:00.000Z');
  });

  it('returns 500 when the update throws', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.course.update.mockRejectedValue(new Error('db down'));
    const res = await PATCH(jsonRequest({ name: 'X' }), paramsWrapper('c1'));
    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/courses/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 for non-admin users', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(studentUser);
    const res = await DELETE(
      new Request('http://localhost'),
      paramsWrapper('c1')
    );
    expect(res.status).toBe(403);
  });

  it('returns 403 when unauthenticated', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(null);
    const res = await DELETE(
      new Request('http://localhost'),
      paramsWrapper('c1')
    );
    expect(res.status).toBe(403);
  });

  it('deletes the files of every material in the course', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    storageMocks.deleteFile.mockResolvedValue(true);
    prismaMocks.material.findMany.mockResolvedValue([
      { storagePath: 'u1/a.pdf' },
      { storagePath: null },
      { storagePath: 'u1/b.pdf' },
    ]);
    prismaMocks.course.delete.mockResolvedValue({});

    const res = await DELETE(
      new Request('http://localhost'),
      paramsWrapper('c1')
    );
    expect(res.status).toBe(200);
    expect(storageMocks.deleteFile).toHaveBeenCalledWith('u1/a.pdf');
    expect(storageMocks.deleteFile).toHaveBeenCalledWith('u1/b.pdf');
    expect(storageMocks.deleteFile).toHaveBeenCalledTimes(2);
    expect(prismaMocks.course.delete).toHaveBeenCalledWith({
      where: { id: 'c1' },
    });
  });

  it('returns 500 when deletion throws', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.material.findMany.mockRejectedValue(new Error('db down'));
    const res = await DELETE(
      new Request('http://localhost'),
      paramsWrapper('c1')
    );
    expect(res.status).toBe(500);
  });
});
