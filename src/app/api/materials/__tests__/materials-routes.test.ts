import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMocks = vi.hoisted(() => ({
  material: {
    findUnique: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
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

import { POST as reviewPOST } from '@/app/api/materials/[id]/review/route';
import { DELETE as materialDELETE } from '@/app/api/materials/[id]/route';

const adminUser = { id: 'admin-1', email: 'admin@neei.online', role: 'ADMIN' };
const studentUser = {
  id: 'student-1',
  email: 'a12345@ualg.pt',
  role: 'STUDENT',
};

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/materials/m1/review', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function paramsWrapper(id: string) {
  return { params: Promise.resolve({ id }) };
}

const dbMaterial = {
  id: 'm1',
  courseId: 'c1',
  title: 'Apontamentos',
  description: null,
  storagePath: 'u1/a.pdf',
  webUrl: '/api/files/u1/a.pdf',
  fileName: 'a.pdf',
  reviewStatus: 'pending',
  uploadedById: 'student-1',
  createdAt: new Date('2026-09-01'),
};

describe('POST /api/materials/[id]/review', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(null);
    const res = await reviewPOST(
      jsonRequest({ status: 'approved' }),
      paramsWrapper('m1')
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(studentUser);
    const res = await reviewPOST(
      jsonRequest({ status: 'approved' }),
      paramsWrapper('m1')
    );
    expect(res.status).toBe(403);
  });

  it('rejects an empty status', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    const res = await reviewPOST(jsonRequest({}), paramsWrapper('m1'));
    expect(res.status).toBe(400);
  });

  it('rejects invalid status values', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    for (const status of ['banana', 'PENDING', '']) {
      const res = await reviewPOST(
        jsonRequest({ status }),
        paramsWrapper('m1')
      );
      expect(res.status).toBe(400);
    }
  });

  it('returns 404 when the material does not exist', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.material.findUnique.mockResolvedValue(null);
    const res = await reviewPOST(
      jsonRequest({ status: 'approved' }),
      paramsWrapper('m1')
    );
    expect(res.status).toBe(404);
  });

  it('deletes the file and record when rejecting', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    storageMocks.deleteFile.mockResolvedValue(true);
    prismaMocks.material.findUnique.mockResolvedValue(dbMaterial);
    prismaMocks.material.delete.mockResolvedValue({});

    const res = await reviewPOST(
      jsonRequest({ status: 'rejected' }),
      paramsWrapper('m1')
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(true);
    expect(storageMocks.deleteFile).toHaveBeenCalledWith('u1/a.pdf');
    expect(prismaMocks.material.delete).toHaveBeenCalledWith({
      where: { id: 'm1' },
    });
  });

  it('does not delete a file when rejecting a material without storage', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.material.findUnique.mockResolvedValue({
      ...dbMaterial,
      storagePath: null,
    });
    prismaMocks.material.delete.mockResolvedValue({});
    const res = await reviewPOST(
      jsonRequest({ status: 'rejected' }),
      paramsWrapper('m1')
    );
    expect(res.status).toBe(200);
    expect(storageMocks.deleteFile).not.toHaveBeenCalled();
  });

  it('approves and returns the material payload', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.material.findUnique.mockResolvedValue(dbMaterial);
    prismaMocks.material.update.mockResolvedValue({
      ...dbMaterial,
      reviewStatus: 'approved',
    });

    const res = await reviewPOST(
      jsonRequest({ status: 'approved' }),
      paramsWrapper('m1')
    );
    expect(res.status).toBe(200);
    expect(prismaMocks.material.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: { reviewStatus: 'approved' },
    });
    const body = await res.json();
    expect(body.material.review_status).toBe('approved');
    expect(body.material.course_id).toBe('c1');
    expect(body.material.uploaded_by).toBe('student-1');
  });

  it('returns 500 when the database throws', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.material.findUnique.mockRejectedValue(new Error('db down'));
    const res = await reviewPOST(
      jsonRequest({ status: 'approved' }),
      paramsWrapper('m1')
    );
    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/materials/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(null);
    const res = await materialDELETE(
      new Request('http://localhost'),
      paramsWrapper('m1')
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(studentUser);
    const res = await materialDELETE(
      new Request('http://localhost'),
      paramsWrapper('m1')
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 when the material does not exist', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.material.findUnique.mockResolvedValue(null);
    const res = await materialDELETE(
      new Request('http://localhost'),
      paramsWrapper('m1')
    );
    expect(res.status).toBe(404);
  });

  it('deletes the file and record when the material has a file', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    storageMocks.deleteFile.mockResolvedValue(true);
    prismaMocks.material.findUnique.mockResolvedValue(dbMaterial);
    prismaMocks.material.delete.mockResolvedValue({});

    const res = await materialDELETE(
      new Request('http://localhost'),
      paramsWrapper('m1')
    );
    expect(res.status).toBe(200);
    expect(storageMocks.deleteFile).toHaveBeenCalledWith('u1/a.pdf');
    expect(prismaMocks.material.delete).toHaveBeenCalledWith({
      where: { id: 'm1' },
    });
  });

  it('skips file deletion for materials without a file', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.material.findUnique.mockResolvedValue({
      ...dbMaterial,
      storagePath: null,
    });
    prismaMocks.material.delete.mockResolvedValue({});
    const res = await materialDELETE(
      new Request('http://localhost'),
      paramsWrapper('m1')
    );
    expect(res.status).toBe(200);
    expect(storageMocks.deleteFile).not.toHaveBeenCalled();
  });

  it('returns 500 when the database throws', async () => {
    sessionMocks.getCurrentUser.mockResolvedValue(adminUser);
    prismaMocks.material.findUnique.mockRejectedValue(new Error('db down'));
    const res = await materialDELETE(
      new Request('http://localhost'),
      paramsWrapper('m1')
    );
    expect(res.status).toBe(500);
  });
});
